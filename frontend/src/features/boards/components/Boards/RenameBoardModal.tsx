"use client";
import { useState, useEffect, useRef } from "react";
import { Modal } from "@/shared/modal/Modal/Modal";
import { ModalActions } from "@/shared/modal/ModalActions/ModalActions";
import { useRenameBoard } from "../../hooks/useBoards";

interface IRenameBoardModalProps {
  boardId: string;
  currentName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Модалка переименования доски с автофокусом и Enter/Escape.
export function RenameBoardModal({
  boardId,
  currentName,
  isOpen,
  onClose,
}: IRenameBoardModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: renameBoard, isPending } = useRenameBoard();

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, currentName]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onClose();
      return;
    }
    renameBoard({ id: boardId, name: trimmed }, { onSuccess: onClose });
  };

  return (
    <Modal title="Переименовать доску" visible={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
            if (event.key === "Escape") onClose();
          }}
          placeholder="Название доски"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-nova-blue/30 focus:border-nova-blue transition"
        />

        <ModalActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          isPending={isPending}
          confirmLabel="Сохранить"
          pendingLabel="Сохранение..."
          confirmDisabled={!name.trim()}
        />
      </div>
    </Modal>
  );
}
