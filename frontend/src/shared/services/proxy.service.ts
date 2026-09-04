import type { NextRequest } from "next/server";
import { AUTH_CHECK_TIMEOUT } from "@/shared/config/proxy.constant";

export type TAuthCheckError = "timeout" | "network" | "server";

export type TAuthCheckResult = {
  isAuthenticated: boolean;
  apiResponse: Response | null;
  error?: TAuthCheckError;
};

// Сервис проверки auth со стороны Next.js middleware.
// API_URL — серверная переменная (в docker = http://nginx:80, чтобы middleware
// ходил к бэку по docker-сети, а не через localhost контейнера).
// NEXT_PUBLIC_API_URL — fallback для raw-dev, где обе стороны видят одно и то же.
class ProxyService {
  private readonly API_URL =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

  checkAuthentication = async (
    request: NextRequest,
  ): Promise<TAuthCheckResult> => {
    try {
      const apiResponse = await fetch(
        `${this.API_URL}/users/is-authenticated`,
        {
          method: "GET",
          headers: {
            cookie: request.headers.get("cookie") ?? "",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(AUTH_CHECK_TIMEOUT),
        },
      );
      if (!apiResponse.ok) {
        return {
          isAuthenticated: false,
          apiResponse,
          error: "server",
        };
      }
      const json = await apiResponse.json().catch(() => null);
      const isAuthenticated = Boolean(json?.authenticated);
      return { isAuthenticated, apiResponse };
    } catch (error: unknown) {
      const errorName = (error as { name?: string })?.name;
      if (errorName === "TimeoutError" || errorName === "AbortError") {
        return { isAuthenticated: false, apiResponse: null, error: "timeout" };
      }
      return { isAuthenticated: false, apiResponse: null, error: "network" };
    }
  };
}

export const proxyService = new ProxyService();
