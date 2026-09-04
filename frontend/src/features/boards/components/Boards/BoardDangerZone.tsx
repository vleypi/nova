"use client";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import {
  useExportBoard,
  useDeleteBoard,
  useDuplicateBoard,
} from "../../hooks/useBoards";

interface IBoardDangerZoneProps {
  boardId: string;
  boardName: string;
  onDeleted: () => void;
}

// Действия над доской: backup, дублирование плюс confirm-удаление.
export function BoardDangerZone({
  boardId,
  boardName,
  onDeleted,
}: IBoardDangerZoneProps) {
  const { mutate: exportBoard, isPending: isExporting } = useExportBoard();
  const { mutate: duplicateBoard, isPending: isDuplicating } =
    useDuplicateBoard();
  const { mutate: deleteBoard, isPending: isDeleting } = useDeleteBoard();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Действия
        </p>

        <button
          onClick={() => exportBoard(boardId)}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {isExporting ? "Скачивание..." : "Скачать резервную копию"}
        </button>

        <button
          onClick={() => duplicateBoard(boardId)}
          disabled={isDuplicating}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {isDuplicating ? "Дублирование..." : "Дублировать доску"}
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Опасная зона
        </p>

        <ConfirmAction
          label="Удалить доску"
          confirmText={`Удалить "${boardName}" безвозвратно?`}
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
          onConfirm={() => deleteBoard(boardId, { onSuccess: onDeleted })}
        />
      </div>
    </div>
  );
}
