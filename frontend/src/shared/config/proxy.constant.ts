// Константы reverse-proxy и auth-маршрутизации (next-middleware и axios).
import { DASHBOARD_ROOT } from "./routes.constant";

// Имена cookie с access/refresh токенами на стороне клиента.
export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

// Маршрут страницы авторизации (отдельный, чтобы не дублировать в нескольких местах).
export const AUTH_ROUTE = "/auth";

// Префиксы маршрутов: protected требуют auth, public-only недоступны авторизованным.
export const PROTECTED_ROUTES = ["/app"];
export const PUBLIC_ONLY_ROUTES = [AUTH_ROUTE, "/signup", "/"];

// Куда редиректить авторизованного пользователя.
export const DEFAULT_PROTECTED_ROUTE = DASHBOARD_ROOT;

// Таймаут проверки auth в middleware (мс).
export const AUTH_CHECK_TIMEOUT = 5000;

// Если true — при ошибке auth-check пропускаем запрос (grace), иначе redirect.
export const GRACE_PERIOD_ON_ERROR = false;
