// Маршруты дашборда и URL-builders. Единая точка правды для путей,
// которые иначе расходятся по компонентам как magic-strings.

export const DASHBOARD_ROOT = "/app/dashboard";

export const DASHBOARD_FAVORITES = `${DASHBOARD_ROOT}/favorites`;

// Url страницы конкретного пространства.
export function getSpaceUrl(spaceId: string): string {
  return `${DASHBOARD_ROOT}/${spaceId}`;
}

// Url join-страницы по invite-коду (relative path).
export function getJoinSpacePath(inviteCode: string): string {
  return `${DASHBOARD_ROOT}/join/${inviteCode}`;
}

// Полная invite-ссылка с origin (для clipboard / sharing).
// На сервере (typeof window === "undefined") возвращает только path.
export function getInviteLink(inviteCode: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${getJoinSpacePath(inviteCode)}`;
}
