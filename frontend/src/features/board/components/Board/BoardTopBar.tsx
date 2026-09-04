"use client";
import { useBoardById } from "@/features/boards/hooks/useBoards";
interface IBoardTopBarProps {
  boardId: string;
}
export function BoardTopBar({ boardId }: IBoardTopBarProps) {
  const { data: board, isLoading } = useBoardById(boardId, true);
  return (
    <div className="absolute top-4 left-4 z-50 h-12 bg-white rounded-lg shadow-md flex items-center gap-2 px-4">
      <span className="text-lg font-bold text-gray-900">nova</span>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-orange-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
        </svg>

        {isLoading ? (
          <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
        ) : (
          <span className="text-sm font-medium text-gray-700">
            {board?.name ?? "Без названия"}
          </span>
        )}
      </div>

      <button className="p-2.5 hover:bg-gray-100 rounded-lg transition">
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      <button className="p-2.5 hover:bg-gray-100 rounded-lg transition">
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
        </svg>
      </button>
    </div>
  );
}
