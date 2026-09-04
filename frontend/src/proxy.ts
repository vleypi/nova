import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PROTECTED_ROUTES,
  PUBLIC_ONLY_ROUTES,
  GRACE_PERIOD_ON_ERROR,
  REFRESH_COOKIE,
  ACCESS_COOKIE,
  DEFAULT_PROTECTED_ROUTE,
} from "@/shared/config/proxy.constant";
import { proxyService } from "@/shared/services/proxy.service";
import { matchesAny } from "@/shared/utils/proxy.util";
function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
function forwardSetCookie(apiHeaders: Headers, clientRes: NextResponse) {
  const setCookies =
    typeof apiHeaders.getSetCookie === "function"
      ? apiHeaders.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    clientRes.headers.append("set-cookie", cookie);
  }
}
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = matchesAny(pathname, PROTECTED_ROUTES);
  const isOnlyPublicRoute = matchesAny(pathname, PUBLIC_ONLY_ROUTES);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasAnyToken = Boolean(accessToken || refreshToken);
  if (!hasAnyToken) {
    if (isProtectedRoute) {
      const url = new URL(PUBLIC_ONLY_ROUTES[0], request.url);
      url.searchParams.set("next", pathname);
      return clearAuthCookies(NextResponse.redirect(url));
    }
    return NextResponse.next();
  }
  const { isAuthenticated, apiResponse, error } =
    await proxyService.checkAuthentication(request);
  if (error && !GRACE_PERIOD_ON_ERROR) {
    if (isProtectedRoute) {
      const url = new URL(PUBLIC_ONLY_ROUTES[0], request.url);
      url.searchParams.set("next", pathname);
      url.searchParams.set("error", "service_unavailable");
      console.warn(
        `Blocking access to ${pathname} due to auth service ${error}`,
      );
      return clearAuthCookies(NextResponse.redirect(url));
    }
    return clearAuthCookies(NextResponse.next());
  }
  if (isAuthenticated && isOnlyPublicRoute) {
    const res = NextResponse.redirect(
      new URL(DEFAULT_PROTECTED_ROUTE, request.url),
    );
    if (apiResponse) forwardSetCookie(apiResponse.headers, res);
    return res;
  }
  if (!isAuthenticated && isProtectedRoute) {
    const url = new URL(PUBLIC_ONLY_ROUTES[0], request.url);
    url.searchParams.set("next", pathname);
    let res = NextResponse.redirect(url);
    res = clearAuthCookies(res);
    if (apiResponse) forwardSetCookie(apiResponse.headers, res);
    return res;
  }
  if (!isAuthenticated && hasAnyToken) {
    let res = NextResponse.next();
    res = clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.next();
  if (apiResponse) forwardSetCookie(apiResponse.headers, res);
  return res;
}
export const config = {
  matcher: ["/app/:path*", "/auth", "/signup"],
};
