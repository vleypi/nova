"use client";
import { useState } from "react";
import { useRenameBoard } from "../../hooks/useBoards";
import { IBoard } from "../../interfaces/board.interface";

interface IBoardNameFormProps {
  board: IBoard;
}

// Inline-форма переименования доски с кнопкой submit рядом с input.
export function BoardNameForm({ board }: IBoardNameFormProps) {
  const [name, setName] = useState(board.name);

  const { mutate: renameBoard, isPending } = useRenameBoard();

  const trimmedName = name.trim();
  const hasChanges = trimmedName !== "" && trimmedName !== board.name;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;
    renameBoard({ id: board.id, name: trimmedName });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Название доски</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Отображается в списке досок и на самой доске
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          placeholder="Название доски"
          className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-nova-blue/30 focus:border-nova-blue transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!hasChanges || isPending}
          className="px-4 py-2.5 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
        >
          {isPending ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
