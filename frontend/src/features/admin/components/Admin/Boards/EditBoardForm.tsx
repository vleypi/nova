"use client";
import Link from "next/link";
import { IUser } from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import { formatDateRu } from "@/shared/utils/date.util";
import {
  BOARD_ICON_PATH,
  getBoardGradient,
} from "@/features/boards";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { IAdminBoard } from "../../../interfaces/admin.interface";
import { BoardDangerZone } from "./BoardDangerZone";
import { BoardStatsTab } from "./BoardStatsTab";
import { BoardMembersTab } from "./BoardMembersTab";
import { EditUserForm } from "../Users/EditUserForm";

interface IEditBoardFormProps {
  board: IAdminBoard;
  onClose: () => void;
  onBack?: () => void;
  defaultTab?: "general" | "stats" | "members" | "danger";
}

interface IBoardGeneralTabProps {
  board: IAdminBoard;
  onClose: () => void;
}

// Модалка управления доской с табами general/stats/members/danger.
export function EditBoardForm({
  board,
  onClose,
  onBack,
  defaultTab,
}: IEditBoardFormProps) {
  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Информация о доске",
      content: <BoardGeneralTab board={board} onClose={onClose} />,
    },
    {
      id: "stats",
      label: "Статистика",
      icon: "fa-chart-pie",
      description: "Активность на доске и её история",
      content: <BoardStatsTab board={board} />,
    },
    {
      id: "members",
      label: "Участники",
      icon: "fa-users",
      description: "Кто имеет доступ и кто сейчас онлайн",
      content: <BoardMembersTab board={board} />,
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия",
      danger: true,
      content: <BoardDangerZone board={board} onDeleted={onClose} />,
    },
  ];

  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 ${getBoardGradient(board.thumbnail, 0)} rounded-lg flex items-center justify-center flex-shrink-0`}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={BOARD_ICON_PATH}
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {board.name}
            </p>
            <p className="text-xs text-gray-400">Доска</p>
          </div>
        </div>
      }
      tabs={tabs}
      defaultTab={defaultTab}
      onBack={onBack}
    />
  );
}

// Контент таба Основное
function BoardGeneralTab({ board, onClose }: IBoardGeneralTabProps) {
  const { openModal, closeModal } = useModal();
  const { data: usersList } = useAdminUsers({ limit: 10000 });

  const openAuthorModal = () => {
    if (!board.createdBy) return;
    const fresh = usersList?.users.find(
      (candidate) => candidate.id === board.createdBy,
    );
    const userForModal: IUser = fresh ?? {
      id: board.createdBy,
      email: "",
      name: board.createdByUser?.name ?? "",
      avatar: board.createdByUser?.avatar || undefined,
      role: "USER",
      isBlocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const reopenBoard = () => {
      openModal(
        "Управление доской",
        <EditBoardForm
          board={board}
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
        onBack={reopenBoard}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <div
          className={`w-20 h-20 ${getBoardGradient(board.thumbnail, 0)} rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={BOARD_ICON_PATH}
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {board.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {board.isPrivate ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                Приватная
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded">
                Публичная
              </span>
            )}
            {board.isFavorite && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded">
                В избранном
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/app/board/${board.id}`}
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
          Автор
        </p>
        {board.createdByUser ? (
          <button
            onClick={openAuthorModal}
            className="flex items-center gap-3 px-3 py-2 -mx-3 rounded-lg hover:bg-gray-50 transition group text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {(board.createdByUser.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-nova-blue transition-colors">
                {board.createdByUser.name || "—"}
              </p>
              <p className="text-xs text-gray-400 font-mono truncate">
                {board.createdBy}
              </p>
            </div>
            <i className="fas fa-arrow-right text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        ) : (
          <p className="text-sm text-gray-400">Неизвестен</p>
        )}
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">ID доски</p>
          <p
            className="text-sm font-medium text-gray-700 font-mono truncate"
            title={board.id}
          >
            {board.id}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">ID пространства</p>
          <Link
            href={`/app/admin/spaces?search=${board.spaceId}`}
            onClick={onClose}
            className="text-sm font-medium text-nova-blue hover:underline font-mono truncate"
            title={board.spaceId}
          >
            {board.spaceId}
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Создана</p>
          <p className="text-sm font-medium text-gray-700">
            {formatDateRu(board.createdAt)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Обновлена</p>
          <p className="text-sm font-medium text-gray-700">
            {formatDateRu(board.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
