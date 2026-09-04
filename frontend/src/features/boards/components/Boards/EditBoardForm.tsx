"use client";
import { useState } from "react";
import { formatDateRu } from "@/shared/utils/date.util";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import { IBoard } from "../../interfaces/board.interface";
import { useBoardById, useToggleBoardPrivacy } from "../../hooks/useBoards";
import {
  getBoardGradient,
  BOARD_ICON_PATH,
} from "../../constants/dashboard.constant";
import { BoardNameForm } from "./BoardNameForm";
import { BoardThumbnailPicker } from "./BoardThumbnailPicker";
import { BoardDangerZone } from "./BoardDangerZone";

interface IEditBoardFormProps {
  board: IBoard;
  index: number;
  onDeleted: () => void;
}

interface IBoardGeneralTabContentProps {
  board: IBoard;
}

// Модалка управления доской с табами «Основное» и «Опасная зона».
export function EditBoardForm({
  board: initialBoard,
  index,
  onDeleted,
}: IEditBoardFormProps) {
  const { data: liveBoard } = useBoardById(initialBoard.id, true);

  const board = liveBoard ?? initialBoard;
  const gradient = getBoardGradient(board.thumbnail, index);

  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Название, обложка и основные параметры доски",
      content: <BoardGeneralTabContent board={board} />,
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия — будьте осторожны",
      danger: true,
      content: (
        <BoardDangerZone
          boardId={board.id}
          boardName={board.name}
          onDeleted={onDeleted}
        />
      ),
    },
  ];
  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg ${gradient} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
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
    />
  );
}
// Контент таба «Основное»: имя, обложка, приватность, copy-link и метаданные.
function BoardGeneralTabContent({ board }: IBoardGeneralTabContentProps) {
  const { mutate: togglePrivacy, isPending: isTogglingPrivacy } =
    useToggleBoardPrivacy();

  const [copied, setCopied] = useState(false);

  const boardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/app/board/${board.id}`
      : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-8">
      <BoardNameForm board={board} />

      <div className="h-px bg-gray-100" />

      <BoardThumbnailPicker
        boardId={board.id}
        currentThumbnail={board.thumbnail}
      />

      <div className="h-px bg-gray-100" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Приватная доска</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Приватные доски видны только создателю и владельцу пространства
          </p>
        </div>
        <button
          onClick={() =>
            togglePrivacy({ id: board.id, isPrivate: !board.isPrivate })
          }
          disabled={isTogglingPrivacy}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${board.isPrivate ? "bg-nova-blue" : "bg-gray-200"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${board.isPrivate ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Ссылка на доску</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Поделитесь ссылкой для быстрого доступа
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-w-0">
            <svg
              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="text-sm text-gray-600 truncate font-mono">
              {boardUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-shrink-0 ${
              copied
                ? "bg-green-50 border-green-200 text-green-600"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
            }`}
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
                d={
                  copied
                    ? "M5 13l4 4L19 7"
                    : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                }
              />
            </svg>
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">ID доски</p>
          <p className="text-sm text-gray-700 font-mono">{board.id}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Владелец</p>
          <p className="text-sm text-gray-700">
            {board.createdByUser?.name || "—"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Дата создания</p>
          <p className="text-sm text-gray-700">
            {new Date(board.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Последнее изменение</p>
          <p className="text-sm text-gray-700">
            {formatDateRu(board.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
