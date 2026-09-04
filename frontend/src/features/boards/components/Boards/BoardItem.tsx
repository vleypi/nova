"use client";
import Link from "next/link";
import { formatDateRu } from "@/shared/utils/date.util";
import {
  BOARD_ICON_PATH,
  getBoardGradient,
} from "../../constants/dashboard.constant";
import { IBoardItemProps } from "../../interfaces/board.interface";
import { useBoardActions } from "../../hooks/useBoardActions";
import { BoardContextMenu } from "./BoardContextMenu";
import { BoardModalsManager } from "./BoardModalsManager";

// Строка доски в list-режиме с hover-actions и контекстным меню.
export function BoardItem({ board, index }: IBoardItemProps) {
  const actions = useBoardActions(board, index);

  const gradient = getBoardGradient(board.thumbnail, index);
  const ownerName = board.createdByUser?.name || "—";
  const updatedDate = formatDateRu(board.updatedAt);

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-100 items-center group transition">
      <Link
        href={`/app/board/${board.id}`}
        className="col-span-5 flex items-center gap-3"
      >
        <div
          className={`w-10 h-10 ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}
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
        <div>
          <div className="font-medium text-gray-900 flex items-center gap-2">
            {board.name}
            {board.isPrivate && (
              <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                Приватная
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Изменено {ownerName}, {updatedDate}
          </div>
        </div>
      </Link>

      <div className="col-span-2">
        <div className="text-sm text-gray-400">&mdash;</div>
      </div>
      <div className="col-span-2 text-sm text-gray-700">{updatedDate}</div>
      <div className="col-span-2 text-sm text-gray-700">{ownerName}</div>

      <div className="col-span-1 flex items-center justify-end gap-2">
        <button
          onClick={actions.toggleFavorite}
          disabled={actions.isTogglingFavorite}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition disabled:opacity-50"
        >
          <svg
            className={`w-5 h-5 ${board.isFavorite ? "text-gray-600" : "text-gray-400"}`}
            fill={board.isFavorite ? "#facc15" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>

        <div className="relative">
          <button
            ref={actions.menuButtonRef}
            onClick={actions.toggleMenu}
            className={`p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition ${actions.menuOpen ? "!opacity-100 bg-gray-200" : ""}`}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          <BoardContextMenu
            isOpen={actions.menuOpen}
            isFavorite={board.isFavorite}
            isPrivate={board.isPrivate}
            boardId={board.id}
            triggerRef={actions.menuButtonRef}
            onClose={actions.closeMenu}
            onToggleFavorite={actions.toggleFavorite}
            onRename={actions.openRename}
            onDuplicate={actions.duplicate}
            onDetails={actions.openDetails}
            onTogglePrivate={actions.togglePrivate}
            onDelete={actions.openDelete}
            onChangeThumbnail={actions.openThumbnail}
            onExportBackup={actions.exportBackup}
            onMoveToSpace={actions.openMove}
          />
          <BoardModalsManager board={board} actions={actions} />
        </div>
      </div>
    </div>
  );
}
