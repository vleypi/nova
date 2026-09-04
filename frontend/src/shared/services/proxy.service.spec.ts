/**
 * Юнит-тесты для shared/services/proxy.service.checkAuthentication —
 * вызывается из Next.js middleware. Покрывают все ветки: ok+authed, ok+!authed,
 * битый JSON, не-OK ответ (server), сетевая ошибка, AbortError/TimeoutError
 * (timeout), и проброс cookie из request.headers в fetch.
 */

import { proxyService } from "./proxy.service";
import type { NextRequest } from "next/server";

// Минимальный мок NextRequest: нам нужен только .headers.get("cookie").
const makeRequest = (cookie: string | null = "session=abc"): NextRequest =>
  ({
    headers: { get: jest.fn(() => cookie) },
  }) as unknown as NextRequest;

describe("proxyService.checkAuthentication", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn() as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("успешный ответ", () => {
    it("ok=true + JSON { authenticated:true } → isAuthenticated=true, без error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      });
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.apiResponse).not.toBeNull();
    });

    it("ok=true + JSON { authenticated:false } → isAuthenticated=false, без error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: false }),
      });
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("ok=true + битый JSON → isAuthenticated=false, без error (catch внутри .json())", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("bad JSON")),
      });
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("ok=true + JSON без поля authenticated → isAuthenticated=false (Boolean(undefined))", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(false);
    });
  });

  describe("не-OK ответ", () => {
    it("ok=false → isAuthenticated=false, error='server', apiResponse сохраняется", async () => {
      const fakeResponse = { ok: false, status: 500 };
      (global.fetch as jest.Mock).mockResolvedValue(fakeResponse);
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBe("server");
      expect(result.apiResponse).toBe(fakeResponse);
    });
  });

  describe("исключения fetch", () => {
    it("сетевая ошибка → error='network', apiResponse=null", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new TypeError("Network error"),
      );
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBe("network");
      expect(result.apiResponse).toBeNull();
    });

    it("AbortError → error='timeout'", async () => {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      (global.fetch as jest.Mock).mockRejectedValue(abortErr);
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.error).toBe("timeout");
      expect(result.apiResponse).toBeNull();
    });

    it("TimeoutError → error='timeout'", async () => {
      const timeoutErr = new Error("timed out");
      timeoutErr.name = "TimeoutError";
      (global.fetch as jest.Mock).mockRejectedValue(timeoutErr);
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.error).toBe("timeout");
    });

    it("любое другое исключение → error='network' (defensive default)", async () => {
      (global.fetch as jest.Mock).mockRejectedValue("string-throw");
      const result = await proxyService.checkAuthentication(makeRequest());
      expect(result.error).toBe("network");
    });
  });

  describe("проброс cookie и URL", () => {
    it("берёт cookie из request.headers.get('cookie') и кладёт в headers fetch", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      });
      await proxyService.checkAuthentication(
        makeRequest("session=xyz; remember=1"),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/is-authenticated"),
        expect.objectContaining({
          method: "GET",
          headers: { cookie: "session=xyz; remember=1" },
          cache: "no-store",
        }),
      );
    });

    it("если cookie отсутствует (header.get возвращает null) → передаёт пустую строку", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      });
      await proxyService.checkAuthentication(makeRequest(null));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { cookie: "" },
        }),
      );
    });

    it("прикрепляет AbortSignal к запросу (для таймаута)", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      });
      await proxyService.checkAuthentication(makeRequest());
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });
});
