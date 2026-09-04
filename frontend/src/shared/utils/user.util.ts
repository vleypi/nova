import { IUser } from "@/shared/identity";

// Инициалы пользователя из имени (2 буквы) или первая буква email.
export function getUserInitials(user: Pick<IUser, "name" | "email">): string {
  if (user.name) {
    return user.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }
  return user.email[0].toUpperCase();
}
