"use client";
import Link from "next/link";
import { IUser } from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import { formatDateRu } from "@/shared/utils/date.util";
import { getSpaceUrl } from "@/shared/config/routes.constant";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { useAdminSpaceMembers } from "../../../hooks/useAdminSpaceMembers";
import { IAdminSpace } from "../../../interfaces/admin.interface";
import { SpaceDangerZone } from "./SpaceDangerZone";
import { SpaceStatsTab } from "./SpaceStatsTab";
import { SpaceMembersTab } from "./SpaceMembersTab";
import { EditUserForm } from "../Users/EditUserForm";

interface IEditSpaceFormProps {
  space: IAdminSpace;
  onClose: () => void;
  onBack?: () => void;
  defaultTab?: "general" | "stats" | "members" | "danger";
}

interface ISpaceGeneralTabProps {
  space: IAdminSpace;
}

// Модалка управления пространством с табами general/stats/members/danger
export function EditSpaceForm({
  space,
  onClose,
  onBack,
  defaultTab,
}: IEditSpaceFormProps) {
  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Информация о пространстве",
      content: <SpaceGeneralTab space={space} />,
    },
    {
      id: "stats",
      label: "Статистика",
      icon: "fa-chart-pie",
      description: "Активность и содержимое пространства",
      content: <SpaceStatsTab space={space} />,
    },
    {
      id: "members",
      label: "Участники",
      icon: "fa-users",
      description: "Список всех участников пространства",
      content: <SpaceMembersTab space={space} />,
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия",
      danger: true,
      content: <SpaceDangerZone space={space} onDeleted={onClose} />,
    },
  ];

  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {space.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {space.name}
            </p>
            <p className="text-xs text-gray-400">Пространство</p>
          </div>
        </div>
      }
      tabs={tabs}
      defaultTab={defaultTab}
      onBack={onBack}
    />
  );
}

// Контент таба «Основное»: иконка, владелец, метаданные. См. AD8.
function SpaceGeneralTab({ space }: ISpaceGeneralTabProps) {
  const { openModal, closeModal } = useModal();
  const { data: usersList } = useAdminUsers({ limit: 10000 });
  const { data: members } = useAdminSpaceMembers(space.id);

  const ownerMember = members?.find(
    (member) => member.userId === space.ownerId,
  );
  const ownerName = ownerMember?.user?.name;

  const openOwnerModal = () => {
    if (!space.ownerId) return;
    const fresh = usersList?.users.find(
      (candidate) => candidate.id === space.ownerId,
    );
    const userForModal: IUser = fresh ?? {
      id: space.ownerId,
      email: "",
      name: ownerName ?? "",
      avatar: ownerMember?.user?.avatar ?? undefined,
      role: "USER",
      isBlocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const reopenSpace = () => {
      openModal(
        "Управление пространством",
        <EditSpaceForm
          space={space}
          onClose={closeModal}
          defaultTab="general"
        />,
        "xl",
        true,
        true,
      );
    };
    openModal(
      "Управление пользователем",
      <EditUserForm
        user={userForModal}
        onClose={closeModal}
        onBack={reopenSpace}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
          {space.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {space.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded">
              {space.membersCount} участников
            </span>
          </div>
        </div>
        <Link
          href={getSpaceUrl(space.id)}
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-nova-blue hover:bg-blue-50 rounded-lg transition"
        >
          Открыть
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Владелец
        </p>
        <button
          onClick={openOwnerModal}
          className="flex items-center gap-3 px-3 py-2 -mx-3 rounded-lg hover:bg-gray-50 transition group text-left"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {(ownerName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-nova-blue transition-colors">
              {ownerName || "—"}
            </p>
            <p className="text-xs text-gray-400 font-mono truncate">
              {space.ownerId}
            </p>
          </div>
          <i className="fas fa-arrow-right text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors" />
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">ID пространства</p>
          <p
            className="text-sm font-medium text-gray-700 font-mono truncate"
            title={space.id}
          >
            {space.id}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Invite-код</p>
          <p className="text-sm font-medium text-gray-700 font-mono truncate">
            {space.inviteCode}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Создано</p>
          <p className="text-sm font-medium text-gray-700">
            {formatDateRu(space.createdAt)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Обновлено</p>
          <p className="text-sm font-medium text-gray-700">
            {formatDateRu(space.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
