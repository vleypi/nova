import type { ISelectOption } from "@/shared/ui/Select/select.types";
import type { INavItem } from "@/shared/ui/NavBar/NavBar";
import {
  DASHBOARD_ROOT,
  DASHBOARD_FAVORITES,
} from "@/shared/config/routes.constant";

interface IBoardTableColumn {
  key: string;
  label: string;
  className: string;
}
export const BOARD_FILTER_OPTIONS: ISelectOption[] = [
  { value: "all", label: "Все доски" },
  { value: "owned", label: "Принадлежат мне" },
  { value: "not_owned", label: "Не принадлежат мне" },
];
export const BOARD_SORT_OPTIONS: ISelectOption[] = [
  { value: "last_opened", label: "Последний раз открыт" },
  { value: "last_modified", label: "Последний раз изменен" },
  { value: "last_created", label: "Последний раз создан" },
];
export const SORT_GROUP = {
  label: "Сортировать по",
  options: BOARD_SORT_OPTIONS,
};
export const SIDEBAR_NAV_ITEMS: INavItem[] = [
  {
    id: "home",
    label: "Главная",
    href: DASHBOARD_ROOT,
    exact: true,
    iconPath:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "favorites",
    label: "Избранное",
    href: DASHBOARD_FAVORITES,
    iconPath:
      "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
];
export const BOARD_ICON_PATH =
  "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z";
export const BOARD_GRADIENT_PALETTE: string[] = [
  "bg-gradient-to-br from-sky-400 to-blue-500",
  "bg-gradient-to-br from-violet-400 to-purple-500",
  "bg-gradient-to-br from-rose-400 to-pink-500",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-emerald-400 to-teal-500",
  "bg-gradient-to-br from-fuchsia-400 to-pink-500",
  "bg-gradient-to-br from-cyan-400 to-blue-500",
  "bg-gradient-to-br from-indigo-400 to-violet-500",
  "bg-gradient-to-br from-lime-400 to-green-500",
  "bg-gradient-to-br from-yellow-400 to-amber-500",
];
export const BOARD_THUMBNAIL_OPTIONS: {
  id: string;
  label: string;
  gradient: string;
}[] = [
  {
    id: "gradient-0",
    label: "Небо",
    gradient: "bg-gradient-to-br from-sky-400 to-blue-500",
  },
  {
    id: "gradient-1",
    label: "Фиолетовый",
    gradient: "bg-gradient-to-br from-violet-400 to-purple-500",
  },
  {
    id: "gradient-2",
    label: "Роза",
    gradient: "bg-gradient-to-br from-rose-400 to-pink-500",
  },
  {
    id: "gradient-3",
    label: "Янтарь",
    gradient: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  {
    id: "gradient-4",
    label: "Изумруд",
    gradient: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
  {
    id: "gradient-5",
    label: "Фуксия",
    gradient: "bg-gradient-to-br from-fuchsia-400 to-pink-500",
  },
  {
    id: "gradient-6",
    label: "Циан",
    gradient: "bg-gradient-to-br from-cyan-400 to-blue-500",
  },
  {
    id: "gradient-7",
    label: "Индиго",
    gradient: "bg-gradient-to-br from-indigo-400 to-violet-500",
  },
  {
    id: "gradient-8",
    label: "Лайм",
    gradient: "bg-gradient-to-br from-lime-400 to-green-500",
  },
  {
    id: "gradient-9",
    label: "Золото",
    gradient: "bg-gradient-to-br from-yellow-400 to-amber-500",
  },
  {
    id: "gradient-10",
    label: "Закат",
    gradient: "bg-gradient-to-br from-orange-400 to-red-500",
  },
  {
    id: "gradient-11",
    label: "Океан",
    gradient: "bg-gradient-to-br from-teal-400 to-cyan-600",
  },
  {
    id: "gradient-12",
    label: "Лаванда",
    gradient: "bg-gradient-to-br from-purple-300 to-indigo-400",
  },
  {
    id: "gradient-13",
    label: "Мята",
    gradient: "bg-gradient-to-br from-green-300 to-emerald-500",
  },
  {
    id: "gradient-14",
    label: "Персик",
    gradient: "bg-gradient-to-br from-orange-300 to-rose-400",
  },
  {
    id: "gradient-15",
    label: "Сталь",
    gradient: "bg-gradient-to-br from-slate-400 to-gray-600",
  },
];
export function getBoardGradient(
  thumbnail: string | undefined | null,
  index: number,
): string {
  if (thumbnail) {
    const option = BOARD_THUMBNAIL_OPTIONS.find((o) => o.id === thumbnail);
    if (option) return option.gradient;
  }
  return BOARD_GRADIENT_PALETTE[index % BOARD_GRADIENT_PALETTE.length];
}
export const BOARD_TABLE_COLUMNS: IBoardTableColumn[] = [
  { key: "name", label: "Название", className: "col-span-5" },
  { key: "online", label: "Онлайн пользователи", className: "col-span-2" },
  { key: "lastOpened", label: "Последний раз открыт", className: "col-span-2" },
  { key: "owner", label: "Владелец", className: "col-span-2" },
  { key: "actions", label: "", className: "col-span-1" },
];
