"use client";
import {
  IUser,
  useMe,
  ROLE_LABELS_SHORT,
  ROLE_BADGE_CLASSES,
} from "@/shared/identity";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { useAdminUserActivity } from "../../../hooks/useAdminUserActivity";
import { UserDangerZone } from "./UserDangerZone";
import { UserRoleSection } from "./UserRoleSection";
import { UserStatsTab } from "./UserStatsTab";

interface IEditUserFormProps {
  user: IUser;
  onClose: () => void;
  onBack?: () => void;
  defaultTab?: "general" | "stats" | "danger";
}

interface IUserGeneralTabContentProps {
  user: IUser;
  me: IUser;
  isSelf: boolean;
}

// Модалка управления пользователем с табами general/stats/danger
export function EditUserForm({
  user: initialUser,
  onClose,
  onBack,
  defaultTab,
}: IEditUserFormProps) {
  const { data: usersList } = useAdminUsers({ limit: 10000 });
  const { data: me } = useMe();

  const user =
    usersList?.users.find((candidate) => candidate.id === initialUser.id) ??
    initialUser;
  const isSelf = me?.id === user.id;

  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Информация о пользователе и управление ролью",
      content: me ? (
        <UserGeneralTabContent user={user} me={me} isSelf={isSelf} />
      ) : null,
    },
    {
      id: "stats",
      label: "Статистика",
      icon: "fa-chart-pie",
      description: "Активность пользователя, его контент и история действий",
      content: <UserStatsTab user={user} onClose={onClose} />,
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия — будьте осторожны",
      danger: true,
      content: me ? (
        <UserDangerZone
          user={user}
          me={me}
          isSelf={isSelf}
          onDeleted={onClose}
        />
      ) : null,
    },
  ];

  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} size="sm" shape="rounded" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.name || "Без имени"}
            </p>
            <p className="text-xs text-gray-400">Пользователь</p>
          </div>
        </div>
      }
      tabs={tabs}
      defaultTab={defaultTab}
      onBack={onBack}
    />
  );
}

function UserGeneralTabContent({
  user,
  me,
  isSelf,
}: IUserGeneralTabContentProps) {
  const { data: activity } = useAdminUserActivity(user.id, true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <UserAvatar user={user} size="xl" shape="rounded" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {user.name || "Без имени"}
          </p>
          <p className="text-sm text-gray-400 truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${ROLE_BADGE_CLASSES[user.role]}`}
            >
              {ROLE_LABELS_SHORT[user.role]}
            </span>
            {user.isBlocked ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-500 rounded">
                Заблокирован
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded">
                Активен
              </span>
            )}
            {isSelf && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded">
                Это вы
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <UserRoleSection user={user} me={me} isSelf={isSelf} />

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Досок создано</p>
          <p className="text-sm font-medium text-gray-700">
            {activity?.stats.boardsCreated ?? "—"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Пространств</p>
          <p className="text-sm font-medium text-gray-700">
            {activity?.stats.spacesCount ?? "—"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">ID</p>
          <p className="text-sm font-medium text-gray-700 font-mono">
            {user.id}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Дата регистрации</p>
          <p className="text-sm font-medium text-gray-700">
            {new Date(user.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
