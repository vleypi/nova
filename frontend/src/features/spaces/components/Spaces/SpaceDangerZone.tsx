"use client";
import { useMe } from "@/shared/identity";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import { useDeleteSpace } from "../../hooks/useDeleteSpace";
import { useLeaveSpace } from "../../hooks/useLeaveSpace";

interface ISpaceDangerZoneProps {
  spaceId: string;
  ownerId: string;
  onRemoved: () => void;
}

// Опасная зона space: владелец удаляет, остальные покидают.
export function SpaceDangerZone({
  spaceId,
  ownerId,
  onRemoved,
}: ISpaceDangerZoneProps) {
  const { data: me } = useMe();
  const { mutate: deleteSpace, isPending: isDeleting } = useDeleteSpace();
  const { mutate: leaveSpace, isPending: isLeaving } = useLeaveSpace();

  const isOwner = me?.id === ownerId;

  const handleDelete = () => {
    deleteSpace(spaceId, { onSuccess: () => onRemoved() });
  };

  const handleLeave = () => {
    leaveSpace(spaceId, { onSuccess: () => onRemoved() });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Опасная зона
      </p>

      {!isOwner && (
        <ConfirmAction
          label="Покинуть пространство"
          confirmText="Покинуть пространство?"
          confirmLabel="Да, покинуть"
          pendingLabel="Выход..."
          color="orange"
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
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          }
          isPending={isLeaving}
          onConfirm={handleLeave}
        />
      )}

      {isOwner && (
        <ConfirmAction
          label="Удалить пространство"
          confirmText="Удалить безвозвратно?"
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
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          }
          isPending={isDeleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
