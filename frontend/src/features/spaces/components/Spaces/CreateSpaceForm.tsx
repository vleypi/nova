"use client";
import { useState } from "react";
import type { ICreateSpaceFormProps } from "../../interfaces/space.interface";
import { useCreateSpace } from "../../hooks/useCreateSpace";
import { SpaceNameInput } from "./SpaceNameInput";

// Форма создания нового пространства.
export function CreateSpaceForm({
  onSuccess,
  onCancel,
}: ICreateSpaceFormProps) {
  const [name, setName] = useState("");

  const { mutate: createSpace, isPending, error } = useCreateSpace();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createSpace(
      { name: trimmedName },
      { onSuccess: (space) => onSuccess(space) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SpaceNameInput
        value={name}
        onChange={setName}
        placeholder="Моё пространство"
        autoFocus
        disabled={isPending}
        error={error?.message}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm text-gray-500 hover:text-nova-dark transition"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isPending}
          className="px-4 py-2 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Создание..." : "Создать"}
        </button>
      </div>
    </form>
  );
}
