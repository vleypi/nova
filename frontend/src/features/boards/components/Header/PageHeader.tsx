"use client";
import type { ISpace } from "@/features/spaces";

interface IPageHeaderProps {
  title: string;
  space?: ISpace;
  onEdit?: () => void;
  onCreateBoard?: () => void;
}

// Шапка страницы дашборда: заголовок плюс опциональные действия.
export function PageHeader({
  title,
  space,
  onEdit,
  onCreateBoard,
}: IPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <div className="flex gap-3">
        {space && onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Редактировать
          </button>
        )}
        {onCreateBoard && (
          <button
            onClick={onCreateBoard}
            className="px-4 py-2 bg-nova-blue text-white text-sm font-medium hover:bg-nova-blue/90 rounded-lg transition flex items-center gap-2"
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
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Создать новую
          </button>
        )}
      </div>
    </div>
  );
}
