"use client";
import { Modal } from "@/shared/modal/Modal/Modal";
import { formatDateRu } from "@/shared/utils/date.util";
import { useBoardById } from "../../hooks/useBoards";

interface IBoardDetailsModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface IDetailRowProps {
  label: string;
  children: React.ReactNode;
}

// Строка деталей: label слева, значение справа.
function DetailRow({ label, children }: IDetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">
        {children}
      </span>
    </div>
  );
}

// Skeleton-сетка деталей на время загрузки.
function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex justify-between py-3 border-b border-gray-100"
        >
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// Модалка только-чтение деталей доски.
export function BoardDetailsModal({
  boardId,
  isOpen,
  onClose,
}: IBoardDetailsModalProps) {
  const { data: board, isLoading, isError } = useBoardById(boardId, isOpen);

  return (
    <Modal title="Детали доски" visible={isOpen} onClose={onClose}>
      {isLoading && <DetailsSkeleton />}

      {isError && (
        <p className="text-sm text-red-500">
          Не удалось загрузить детали доски.
        </p>
      )}

      {board && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 pb-4 mb-1 border-b border-gray-100">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{board.name}</p>
              <p className="text-xs text-gray-400">ID: {board.id}</p>
            </div>
          </div>

          <DetailRow label="Владелец">
            {board.createdByUser?.name || "—"}
          </DetailRow>

          <DetailRow label="Создана">{formatDateRu(board.createdAt)}</DetailRow>

          <DetailRow label="Изменена">
            {formatDateRu(board.updatedAt)}
          </DetailRow>

          <DetailRow label="Приватность">
            {board.isPrivate ? (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                Приватная
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                Публичная
              </span>
            )}
          </DetailRow>

          <DetailRow label="Избранное">
            {board.isFavorite ? (
              <span className="flex items-center gap-1 text-yellow-500">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                Да
              </span>
            ) : (
              <span className="text-gray-400">Нет</span>
            )}
          </DetailRow>
        </div>
      )}
    </Modal>
  );
}
