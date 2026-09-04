"use client";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import { IUser, ROLE_HIERARCHY } from "@/shared/identity";
import { useAdminBlockUser } from "../../../hooks/useAdminBlockUser";
import { useAdminDeleteUser } from "../../../hooks/useAdminDeleteUser";

interface IUserDangerZoneProps {
  user: IUser;
  me: IUser;
  isSelf: boolean;
  onDeleted: () => void;
}

interface ILockedNoticeProps {
  variant: "info" | "warning";
  title: string;
  message: string;
}

export function UserDangerZone({
  user,
  me,
  isSelf,
  onDeleted,
}: IUserDangerZoneProps) {
  const { mutate: blockUser, isPending: isBlocking } = useAdminBlockUser();
  const { mutate: deleteUser, isPending: isDeleting } = useAdminDeleteUser();

  const isSuperAdmin = me.role === "SUPER_ADMIN";
  const targetOutOfReach =
    !isSuperAdmin && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[me.role];

  if (isSelf) {
    return (
      <LockedNotice
        variant="info"
        title="Это ваш аккаунт"
        message="Нельзя заблокировать или удалить собственный аккаунт. Управляйте своим профилем через раздел «Профиль»."
      />
    );
  }

  if (targetOutOfReach) {
    return (
      <LockedNotice
        variant="warning"
        title="Недостаточно прав"
        message="У этого пользователя роль равная или выше вашей. Вы не можете блокировать или удалить его."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Блокировка
        </p>

        <ConfirmAction
          key={user.isBlocked ? "blocked" : "active"}
          label={
            user.isBlocked
              ? "Разблокировать пользователя"
              : "Заблокировать пользователя"
          }
          confirmText={
            user.isBlocked
              ? "Разблокировать этого пользователя?"
              : "Заблокировать этого пользователя?"
          }
          confirmLabel={
            user.isBlocked ? "Да, разблокировать" : "Да, заблокировать"
          }
          pendingLabel={user.isBlocked ? "Разблокировка..." : "Блокировка..."}
          color="orange"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  user.isBlocked
                    ? "M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                }
              />
            </svg>
          }
          isPending={isBlocking}
          onConfirm={() =>
            blockUser({ id: user.id, isBlocked: !user.isBlocked })
          }
        />
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Удаление
        </p>
        <ConfirmAction
          label="Удалить пользователя"
          confirmText={`Удалить ${user.email} безвозвратно?`}
          confirmLabel="Да, удалить"
          pendingLabel="Удаление..."
          color="red"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          }
          isPending={isDeleting}
          onConfirm={() => deleteUser(user.id, { onSuccess: onDeleted })}
        />
      </div>
    </div>
  );
}

function LockedNotice({ variant, title, message }: ILockedNoticeProps) {
  const styles =
    variant === "info"
      ? {
          bg: "bg-blue-50/50",
          border: "border-blue-100",
          icon: "text-blue-500",
          title: "text-blue-900",
          text: "text-blue-700",
        }
      : {
          bg: "bg-amber-50/50",
          border: "border-amber-100",
          icon: "text-amber-500",
          title: "text-amber-900",
          text: "text-amber-700",
        };
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 border ${styles.border} ${styles.bg} rounded-lg`}
    >
      <svg
        className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className={`text-sm font-medium ${styles.title}`}>{title}</p>
        <p className={`text-xs ${styles.text} mt-0.5`}>{message}</p>
      </div>
    </div>
  );
}
