"use client";
import { IUser } from "@/shared/identity";
import { getUserInitials } from "@/shared/utils/user.util";

const AVATAR_FALLBACK_GRADIENT =
  "bg-gradient-to-br from-purple-400 to-pink-400";

export type TUserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type TUserAvatarShape = "circle" | "rounded";

interface IAvatarSubject {
  name?: string | null;
  email: string;
  avatar?: string | null;
}

interface IUserAvatarProps {
  user: IAvatarSubject;
  size?: TUserAvatarSize;
  shape?: TUserAvatarShape;
  className?: string;
}

const SIZE_CLASSES: Record<
  TUserAvatarSize,
  { container: string; text: string }
> = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-8 h-8", text: "text-sm" },
  md: { container: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-12 h-12", text: "text-base" },
  xl: { container: "w-16 h-16", text: "text-xl" },
};

const SHAPE_CLASSES: Record<TUserAvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
};

// Аватар пользователя: фото или инициалы на градиенте, 5 размеров и 2 формы.
export function UserAvatar({
  user,
  size = "md",
  shape = "circle",
  className = "",
}: IUserAvatarProps) {
  const { container, text } = SIZE_CLASSES[size];
  const shapeClass = SHAPE_CLASSES[shape];

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name ?? user.email}
        className={`${container} ${shapeClass} object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${container} ${shapeClass} ${AVATAR_FALLBACK_GRADIENT} flex items-center justify-center text-white font-bold flex-shrink-0 ${text} ${className}`}
      aria-label={user.name ?? user.email}
    >
      {getUserInitials(user as Pick<IUser, "name" | "email">)}
    </div>
  );
}
