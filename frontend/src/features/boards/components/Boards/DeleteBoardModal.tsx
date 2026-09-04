"use client";
import { Modal } from "@/shared/modal/Modal/Modal";
import { ModalActions } from "@/shared/modal/ModalActions/ModalActions";
import { useDeleteBoard } from "../../hooks/useBoards";

interface IDeleteBoardModalProps {
  boardId: string;
  boardName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Confirm-модалка удаления доски с предупреждением.
export function DeleteBoardModal({
  boardId,
  boardName,
  isOpen,
  onClose,
}: IDeleteBoardModalProps) {
  const { mutate: deleteBoard, isPending } = useDeleteBoard();

  const handleDelete = () => {
    deleteBoard(boardId, { onSuccess: onClose });
  };

  return (
    <Modal title="Удалить доску" visible={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-sm text-red-700">
            Доска <span className="font-semibold">«{boardName}»</span> будет
            удалена безвозвратно. Это действие нельзя отменить.
          </p>
        </div>

        <ModalActions
          onCancel={onClose}
          onConfirm={handleDelete}
          isPending={isPending}
          confirmLabel="Да, удалить"
          pendingLabel="Удаление..."
          variant="danger"
        />
      </div>
    </Modal>
  );
}
