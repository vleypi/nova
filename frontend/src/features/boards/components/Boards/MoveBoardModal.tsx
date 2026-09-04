"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/shared/modal/Modal/Modal";
import { ModalActions } from "@/shared/modal/ModalActions/ModalActions";
import { useSpaces } from "@/features/spaces";
import { useMoveBoard } from "../../hooks/useBoards";

interface IMoveBoardModalProps {
  boardId: string;
  currentSpaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Модалка перемещения доски в другое пространство.
export function MoveBoardModal({
  boardId,
  currentSpaceId,
  isOpen,
  onClose,
}: IMoveBoardModalProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const { mutate: moveBoard, isPending } = useMoveBoard();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();

  const availableSpaces = (spaces ?? []).filter(
    (space) => space.id !== currentSpaceId,
  );

  useEffect(() => {
    if (isOpen) setSelectedSpaceId("");
  }, [isOpen]);

  const handleSubmit = () => {
    if (!selectedSpaceId) return;
    moveBoard(
      { id: boardId, targetSpaceId: selectedSpaceId },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      title="Переместить в пространство"
      visible={isOpen}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {spacesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : availableSpaces.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Нет других пространств для перемещения
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {availableSpaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setSelectedSpaceId(space.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-left transition
                  ${
                    selectedSpaceId === space.id
                      ? "bg-nova-blue/10 text-nova-blue ring-1 ring-nova-blue/30"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <div
                  className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${selectedSpaceId === space.id ? "bg-nova-blue text-white" : "bg-gray-100 text-gray-500"}
                `}
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <span className="font-medium truncate">{space.name}</span>
                {selectedSpaceId === space.id && (
                  <svg
                    className="w-4 h-4 ml-auto flex-shrink-0 text-nova-blue"
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
                )}
              </button>
            ))}
          </div>
        )}

        <ModalActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          isPending={isPending}
          confirmLabel="Переместить"
          pendingLabel="Перемещение..."
          confirmDisabled={!selectedSpaceId}
        />
      </div>
    </Modal>
  );
}
