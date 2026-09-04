import type { INavItem } from "@/shared/ui/NavBar/NavBar";
import type { ISelectOption } from "@/shared/ui/Select/select.types";

// Polling-интервал health-чек системы (мс).
export const ADMIN_HEALTH_REFETCH_INTERVAL_MS = 30_000;

// Polling-интервал realtime-онлайн данных (мс).
export const ADMIN_REALTIME_REFETCH_INTERVAL_MS = 10_000;

export const USER_ROLE_FILTER_OPTIONS: ISelectOption[] = [
  { value: "all", label: "Все роли" },
  { value: "SUPER_ADMIN", label: "Супер-админ" },
  { value: "ADMIN", label: "Админ" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "USER", label: "Пользователь" },
];
export const USER_STATUS_FILTER_OPTIONS: ISelectOption[] = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Активные" },
  { value: "blocked", label: "Заблокированные" },
];
export const BOARD_PRIVACY_FILTER_OPTIONS: ISelectOption[] = [
  { value: "all", label: "Все доски" },
  { value: "public", label: "Публичные" },
  { value: "private", label: "Приватные" },
];
export const ADMIN_NAV_ITEMS: INavItem[] = [
  {
    id: "overview",
    label: "Обзор",
    href: "/app/admin",
    exact: true,
    iconPath:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: "users",
    label: "Пользователи",
    href: "/app/admin/users",
    iconPath:
      "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    id: "boards",
    label: "Доски",
    href: "/app/admin/boards",
    iconPath:
      "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  },
  {
    id: "spaces",
    label: "Пространства",
    href: "/app/admin/spaces",
    iconPath:
      "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    id: "audit",
    label: "Аудит",
    href: "/app/admin/audit",
    iconPath:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    id: "system",
    label: "Система",
    href: "/app/admin/system",
    iconPath:
      "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
  },
  {
    id: "realtime",
    label: "Реалтайм",
    href: "/app/admin/realtime",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];
