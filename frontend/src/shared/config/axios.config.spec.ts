/**
 * Юнит-тесты для shared/config/axios.config — успех-интерсептор (распаковка
 * data.data) и error-интерсептор (401 refresh flow, _retry guard, refresh-fail
 * с clearUserData + редиректом, обработка не-401 ошибок).
 *
 * Стиль повторяет board-ws.service.spec.ts: jest.mock до импортов, фабрика
 * loadModule() возвращает свежую пару (onSuccess, onError) после resetModules.
 */

// jest.mock объявления должны быть до импортов. Имена переменных-фабрик
// начинаются с "mock" — jest разрешает их использовать внутри factory.
// Все mock-функции живут на уровне модуля spec'а: после resetModules мок-фабрика
// повторно не вызывается, поэтому через эти ссылки мы остаёмся синхронизированы
// с инстансом, который импортирован в свежезагруженный axios.config.
const mockAxiosCreate = jest.fn();
const mockAxiosPost = jest.fn();
const mockInterceptorUse = jest.fn();
const mockAxiosInstance = jest.fn() as unknown as jest.Mock & {
  interceptors: { response: { use: jest.Mock } };
};
mockAxiosInstance.interceptors = {
  response: { use: mockInterceptorUse },
};
mockAxiosCreate.mockReturnValue(mockAxiosInstance);

const mockClearUserData = jest.fn();
const mockHandleServiceError = jest.fn((e: unknown) => e);

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: mockAxiosCreate,
    post: mockAxiosPost,
  },
}));

jest.mock("@/shared/utils/storage.util", () => ({
  clearUserData: mockClearUserData,
}));

jest.mock("@/shared/utils/service.util", () => ({
  handleServiceError: mockHandleServiceError,
}));

type InterceptorHandlers = {
  onSuccess: (response: { data: unknown }) => { data: unknown };
  onError: (error: unknown) => Promise<unknown>;
};

// Каждый тест получает свежую пару интерсепторов: resetModules + require
// заставляет axios.config выполниться заново и зарегистрировать use().
const loadConfig = (): InterceptorHandlers => {
  jest.resetModules();
  mockAxiosCreate.mockClear();
  mockAxiosPost.mockClear();
  mockInterceptorUse.mockClear();
  mockAxiosInstance.mockClear();
  mockAxiosCreate.mockReturnValue(mockAxiosInstance);
  mockClearUserData.mockClear();
  mockHandleServiceError.mockClear();
  mockHandleServiceError.mockImplementation((e: unknown) => e);

  let onSuccess: InterceptorHandlers["onSuccess"] | undefined;
  let onError: InterceptorHandlers["onError"] | undefined;
  mockInterceptorUse.mockImplementation(
    (s: InterceptorHandlers["onSuccess"], e: InterceptorHandlers["onError"]) => {
      onSuccess = s;
      onError = e;
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./axios.config");

  return { onSuccess: onSuccess!, onError: onError! };
};

describe("axios.config", () => {
  describe("инициализация инстанса", () => {
    it("создаёт axios-инстанс с baseURL=/api, JSON-header, withCredentials и таймаутом", () => {
      loadConfig();
      expect(mockAxiosCreate).toHaveBeenCalledTimes(1);
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: "/api",
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
        withCredentials: true,
      });
    });

    it("регистрирует ровно одну пару response-интерсепторов", () => {
      loadConfig();
      expect(mockInterceptorUse).toHaveBeenCalledTimes(1);
      expect(mockInterceptorUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
      );
    });
  });

  describe("success-интерсептор: распаковка nested data", () => {
    it("response.data = { data: X } → подменяет на X", () => {
      const { onSuccess } = loadConfig();
      const result = onSuccess({ data: { data: { user: "vova" } } });
      expect(result.data).toEqual({ user: "vova" });
    });

    it("response.data без поля data → возвращает как есть", () => {
      const { onSuccess } = loadConfig();
      const payload = { user: "vova" };
      const result = onSuccess({ data: payload });
      expect(result.data).toBe(payload);
    });

    it("response.data === null → не падает, оставляет null", () => {
      const { onSuccess } = loadConfig();
      const result = onSuccess({ data: null });
      expect(result.data).toBeNull();
    });
  });

  describe("error-интерсептор: 401 refresh flow", () => {
    it("401 без _retry → шлёт POST /auth/refresh с withCredentials и ретраит оригинальный запрос", async () => {
      const { onError } = loadConfig();
      mockAxiosPost.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ data: "retry-success" });

      const originalError = {
        response: { status: 401 },
        config: { url: "/users/me", method: "get" },
      };
      const result = await onError(originalError);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/auth/refresh",
        {},
        { withCredentials: true },
      );
      // Ретрай через сам axiosInstance (не через axios) с пометкой _retry=true.
      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/users/me", _retry: true }),
      );
      expect(result).toEqual({ data: "retry-success" });
    });

    it("401 с уже выставленным _retry=true → не пробует refresh, реджектит сразу", async () => {
      const { onError } = loadConfig();
      const err = {
        response: { status: 401 },
        config: { url: "/users/me", _retry: true },
      };
      await expect(onError(err)).rejects.toBe(err);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockHandleServiceError).toHaveBeenCalledWith(err);
    });

    it("refresh упал → clearUserData + реджект с handleServiceError(refreshError)", async () => {
      const { onError } = loadConfig();
      const refreshErr = new Error("refresh failed");
      mockAxiosPost.mockRejectedValueOnce(refreshErr);

      // Глушим жалобу jsdom "Not implemented: navigation" при window.location.href = "/auth".
      // Сам редирект в jsdom непроверяем (href — non-configurable own property),
      // поэтому ограничиваемся проверкой clearUserData + проброса ошибки.
      const consoleErrSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const err = {
          response: { status: 401 },
          config: { url: "/users/me" },
        };
        await expect(onError(err)).rejects.toBe(refreshErr);
        expect(mockClearUserData).toHaveBeenCalledTimes(1);
        // axiosInstance ретрая НЕ было — упали раньше.
        expect(mockAxiosInstance).not.toHaveBeenCalled();
      } finally {
        consoleErrSpy.mockRestore();
      }
    });
  });

  describe("error-интерсептор: не-401 ошибки", () => {
    it("500 → реджект через handleServiceError, без refresh", async () => {
      const { onError } = loadConfig();
      const err = {
        response: { status: 500 },
        config: { url: "/users/me" },
      };
      await expect(onError(err)).rejects.toBe(err);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockAxiosInstance).not.toHaveBeenCalled();
      expect(mockHandleServiceError).toHaveBeenCalledWith(err);
    });

    it("403 → реджект, без refresh", async () => {
      const { onError } = loadConfig();
      const err = {
        response: { status: 403 },
        config: { url: "/users/me" },
      };
      await expect(onError(err)).rejects.toBe(err);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("network error (нет response) → реджект через handleServiceError", async () => {
      const { onError } = loadConfig();
      const err = { config: { url: "/users/me" } };
      await expect(onError(err)).rejects.toBe(err);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockHandleServiceError).toHaveBeenCalledWith(err);
    });
  });
});
