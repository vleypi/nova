"use client";
import { useState, type SubmitEventHandler } from "react";
import type { ISpace } from "../../interfaces/space.interface";
import { useUpdateSpace } from "../../hooks/useUpdateSpace";
import { SpaceNameInput } from "./SpaceNameInput";

interface ISpaceNameFormProps {
  space: ISpace;
  onClose?: () => void;
}

// Inline-форма переименования space с кнопкой submit рядом с input.
// onClose опционален: вызывается после успешного rename, если caller хочет
// закрыть обёртку (модалку и т.п.).
export function SpaceNameForm({ space, onClose }: ISpaceNameFormProps) {
  const [name, setName] = useState(space.name);
  const { mutate: updateSpace, isPending, error } = useUpdateSpace();

  const trimmedName = name.trim();
  const hasChanges = trimmedName !== "" && trimmedName !== space.name;

  const handleSave: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!hasChanges) return;

    updateSpace(
      { spaceId: space.id, data: { name: trimmedName } },
      { onSuccess: () => onClose?.() },
    );
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <SpaceNameInput
        value={name}
        onChange={setName}
        disabled={isPending}
        error={error?.message}
        inlineAction={
          <button
            type="submit"
            disabled={!hasChanges || isPending}
            className="px-4 py-2 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
        }
      />
    </form>
  );
}
