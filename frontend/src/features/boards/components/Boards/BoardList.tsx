"use client";
import { IBoardListProps } from "../../interfaces/board.interface";
import { BoardTableHeader } from "./BoardTableHeader";
import { BoardItem } from "./BoardItem";
import { BoardCard } from "./BoardCard";
import { EmptyBoards } from "./EmptyBoards";
import { BoardListSkeleton } from "./BoardListSkeleton";
import { BoardGridSkeleton } from "./BoardGridSkeleton";

// Список досок с переключением list/grid режимов и состоянием loading/error/empty.
export function BoardList({
  boards,
  isLoading,
  isError,
  emptyContent,
  viewMode = "list",
}: IBoardListProps) {
  if (isLoading) {
    return viewMode === "grid" ? <BoardGridSkeleton /> : <BoardListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <p className="text-sm text-gray-500">Не удалось загрузить доски</p>
        </div>
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return emptyContent ? <>{emptyContent}</> : <EmptyBoards />;
  }

  if (viewMode === "grid") {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {boards.map((board, index) => (
            <BoardCard key={board.id} board={board} index={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
      <BoardTableHeader />
      <div className="bg-white rounded-b-lg">
        {boards.map((board, index) => (
          <BoardItem key={board.id} board={board} index={index} />
        ))}
      </div>
    </div>
  );
}
