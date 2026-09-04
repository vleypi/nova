"use client";
import { useModal } from "@/shared/modal/hooks/useModal";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import { IUser } from "@/shared/identity";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { EditUserForm } from "../Users/EditUserForm";

interface IUserFilterPillProps {
  userId: string;
  onReset: () => void;
}

export function UserFilterPill({ userId, onReset }: IUserFilterPillProps) {
  const { data: usersList } = useAdminUsers({ limit: 10000 });
  const { openModal, closeModal } = useModal();

  const user = usersList?.users.find((candidate) => candidate.id === userId);

  const openUserModal = (target: IUser) => {
    openModal(
      "Управление пользователем",
      <EditUserForm user={target} onClose={closeModal} />,
      "xl",
      true,
      true,
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-4 bg-nova-blue/5 border border-nova-blue/20 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-semibold text-nova-blue uppercase tracking-wider flex-shrink-0">
          Фильтр
        </span>
        {user ? (
          <button
            onClick={() => openUserModal(user)}
            className="flex items-center gap-3 min-w-0 px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-white/60 transition text-left group"
            title="Открыть пользователя"
          >
            <UserAvatar user={user} size="xs" />
            <p className="text-sm text-gray-700 truncate">
              <span className="text-gray-400">пользователь:</span>{" "}
              <span className="font-medium group-hover:text-nova-blue transition-colors">
                {user.name || user.email}
              </span>
            </p>
          </button>
        ) : (
          <p className="text-sm text-gray-600 truncate">
            <span className="text-gray-400">userId:</span>{" "}
            <span className="font-mono text-xs">{userId}</span>
          </p>
        )}
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition flex-shrink-0"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        Сбросить
      </button>
    </div>
  );
}
