import type { TUserRole } from "./user.types";

// Полные labels ролей.
export const ROLE_LABELS_FULL: Record<TUserRole, string> = {
  SUPER_ADMIN: "Супер-администратор",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  USER: "Пользователь",
};

// Короткие labels для компактных таблиц.
export const ROLE_LABELS_SHORT: Record<TUserRole, string> = {
  SUPER_ADMIN: "Супер-админ",
  ADMIN: "Админ",
  MANAGER: "Менеджер",
  USER: "Пользователь",
};

// Tailwind-классы для бейджа роли.
export const ROLE_BADGE_CLASSES: Record<TUserRole, string> = {
  SUPER_ADMIN: "bg-red-50 text-red-600",
  ADMIN: "bg-purple-50 text-purple-600",
  MANAGER: "bg-blue-50 text-blue-600",
  USER: "bg-gray-100 text-gray-600",
};

// Порядок ролей по возрастанию полномочий.
export const ROLES_ORDERED: TUserRole[] = [
  "USER",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

// Числовой уровень для сравнений «выше/ниже».
export const ROLE_HIERARCHY: Record<TUserRole, number> = {
  USER: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

// Описания ролей для admin-UI.
export const ROLE_DESCRIPTIONS: Record<TUserRole, string> = {
  USER: "Создаёт доски и пространства, работает с контентом",
  MANAGER:
    "Доступ к разделу админ-панели: пользователи, доски, пространства (только просмотр)",
  ADMIN:
    "Управление пользователями и ролями (кроме супер-админа), блокировка, удаление",
  SUPER_ADMIN:
    "Полный контроль над системой, включая управление другими администраторами",
};
