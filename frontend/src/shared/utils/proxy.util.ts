// Точное совпадение pathname или совпадение префикса с разделителем.
function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Совпадает ли pathname хотя бы с одним из routes по prefix-правилу.
export function matchesAny(pathname: string, routes: string[]) {
  return routes.some((route) => matchesRoute(pathname, route));
}
