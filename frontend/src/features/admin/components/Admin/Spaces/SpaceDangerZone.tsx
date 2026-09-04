"use client";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import { useAdminDeleteSpace } from "../../../hooks/useAdminDeleteSpace";
import { IAdminSpace } from "../../../interfaces/admin.interface";

interface ISpaceDangerZoneProps {
  space: IAdminSpace;
  onDeleted: () => void;
}

// Опасная зона admin-карточки пространства: удаление с каскадом досок
export function SpaceDangerZone({ space, onDeleted }: ISpaceDangerZoneProps) {
  const { mutate: deleteSpace, isPending } = useAdminDeleteSpace();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Удаление
      </p>
      <p className="text-xs text-gray-500 mb-2">
        Удаление пространства также удалит все доски внутри него и всех
        участников. Это необратимо.
      </p>
      <ConfirmAction
        label="Удалить пространство"
        confirmText={`Удалить "${space.name}" и все доски внутри безвозвратно?`}
        confirmLabel="Да, удалить"
        pendingLabel="Удаление..."
        color="red"
        icon={
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        }
        isPending={isPending}
        onConfirm={() => deleteSpace(space.id, { onSuccess: onDeleted })}
      />
    </div>
  );
}
