import { IUser } from "@/shared/identity";
import { STORAGE_KEYS } from "@/shared/config/storage-keys.constant";

// Сохранить current-user снимок в localStorage (для SSR-hydration).
export function saveUserData(user: IUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

// Очистить current-user снимок (logout, refresh-fail).
export function clearUserData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.USER);
}
