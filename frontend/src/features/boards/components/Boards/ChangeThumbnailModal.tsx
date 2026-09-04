"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/shared/modal/Modal/Modal";
import { ModalActions } from "@/shared/modal/ModalActions/ModalActions";
import { useUpdateThumbnail } from "../../hooks/useBoards";
import { BOARD_THUMBNAIL_OPTIONS } from "../../constants/dashboard.constant";

interface IChangeThumbnailModalProps {
  boardId: string;
  currentThumbnail: string;
  isOpen: boolean;
  onClose: () => void;
}

// Модалка выбора thumbnail-градиента из палитры.
export function ChangeThumbnailModal({
  boardId,
  currentThumbnail,
  isOpen,
  onClose,
}: IChangeThumbnailModalProps) {
  const [selected, setSelected] = useState(currentThumbnail || "");

  const { mutate: updateThumbnail, isPending } = useUpdateThumbnail();

  useEffect(() => {
    if (isOpen) setSelected(currentThumbnail || "");
  }, [isOpen, currentThumbnail]);

  const handleSubmit = () => {
    if (!selected || selected === currentThumbnail) {
      onClose();
      return;
    }
    updateThumbnail(
      { id: boardId, thumbnail: selected },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal title="Изменить обложку" visible={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3">
          {BOARD_THUMBNAIL_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`
                relative h-16 rounded-lg ${option.gradient} transition-all
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
                    className="w-5 h-5 text-white drop-shadow"
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

        <ModalActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          isPending={isPending}
          confirmLabel="Сохранить"
          pendingLabel="Сохранение..."
          confirmDisabled={!selected}
        />
      </div>
    </Modal>
  );
}
