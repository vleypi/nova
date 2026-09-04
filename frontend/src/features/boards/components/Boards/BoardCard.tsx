"use client";
import { formatDateRu } from "@/shared/utils/date.util";
import {
  BOARD_ICON_PATH,
  getBoardGradient,
} from "../../constants/dashboard.constant";
import { IBoardItemProps } from "../../interfaces/board.interface";
import { useBoardActions } from "../../hooks/useBoardActions";
import { BoardContextMenu } from "./BoardContextMenu";
import { BoardModalsManager } from "./BoardModalsManager";

// Карточка доски в grid-режиме с hover-actions и контекстным меню.
export function BoardCard({ board, index }: IBoardItemProps) {
  const actions = useBoardActions(board, index);

  const gradient = getBoardGradient(board.thumbnail, index);
  const ownerName = board.createdByUser?.name || "—";
  const updatedDate = formatDateRu(board.updatedAt);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group block cursor-pointer"
      onClick={actions.openBoard}
    >
      <div
        className={`${gradient} h-32 flex items-center justify-center relative`}
      >
        <svg
          className="w-12 h-12 text-white/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d={BOARD_ICON_PATH}
          />
        </svg>

        <div
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={actions.toggleFavorite}
            disabled={actions.isTogglingFavorite}
            className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${board.isFavorite ? "text-gray-600" : "text-gray-400"}`}
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
              className={`w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white rounded-lg shadow-sm transition ${actions.menuOpen ? "!opacity-100 bg-white" : ""}`}
            >
              <svg
                className="w-4 h-4 text-gray-600"
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
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
            {board.name}
          </p>
          {board.isPrivate && (
            <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
              Приватная
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{ownerName}</p>
        <p className="text-xs text-gray-400 mt-0.5">Изменено {updatedDate}</p>
      </div>

      <BoardModalsManager board={board} actions={actions} />
    </div>
  );
}
