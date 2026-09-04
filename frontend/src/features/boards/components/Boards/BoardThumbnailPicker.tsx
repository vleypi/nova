"use client";
import { useState } from "react";
import { useUpdateThumbnail } from "../../hooks/useBoards";
import { BOARD_THUMBNAIL_OPTIONS } from "../../constants/dashboard.constant";

interface IBoardThumbnailPickerProps {
  boardId: string;
  currentThumbnail: string;
}

// Сетка градиент-обложек с превью-выбором и save-кнопкой при изменении.
export function BoardThumbnailPicker({
  boardId,
  currentThumbnail,
}: IBoardThumbnailPickerProps) {
  const [selected, setSelected] = useState(currentThumbnail || "");

  const { mutate: updateThumbnail, isPending } = useUpdateThumbnail();

  const hasChanges = selected !== "" && selected !== currentThumbnail;

  const handleSave = () => {
    if (!hasChanges) return;
    updateThumbnail({ id: boardId, thumbnail: selected });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Обложка</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Выберите градиент для обложки доски
        </p>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {BOARD_THUMBNAIL_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelected(option.id)}
            disabled={isPending}
            className={`
              relative h-10 rounded-lg ${option.gradient} transition-all disabled:opacity-50
              ${
                selected === option.id
                  ? "ring-2 ring-nova-blue ring-offset-2 scale-105"
                  : "hover:scale-105 hover:shadow-md"
              }
            `}
            title={option.label}
          >
            {selected === option.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white drop-shadow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="self-start px-4 py-2 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 transition"
        >
          {isPending ? "Сохранение..." : "Сохранить обложку"}
        </button>
      )}
    </div>
  );
}
