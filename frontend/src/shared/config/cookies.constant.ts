// Ключи всех cookie приложения. Единая точка правды между server-side
// чтением (next layout cookies()) и client-side записью (providers).
export const COOKIE_KEYS = {
  SIDEBAR_OPEN: "sidebar_open",
  BOARD_FILTER: "board_filter",
  BOARD_SORT: "board_sort",
  BOARD_VIEW_MODE: "board_view_mode",
} as const;

// Срок жизни persistent cookie — 1 год в секундах.
export const COOKIE_MAX_AGE_YEAR_SECONDS = 31_536_000;
