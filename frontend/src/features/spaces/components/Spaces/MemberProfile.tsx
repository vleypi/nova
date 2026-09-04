"use client";
import { useState } from "react";
import type {
  ISpaceMember,
  ISpaceMemberPermissions,
} from "../../interfaces/space.interface";
import { useRemoveMember } from "../../hooks/useRemoveMember";
import { useTransferOwnership } from "../../hooks/useTransferOwnership";
import { useUpdateMemberPermissions } from "../../hooks/useUpdateMemberPermissions";

interface IMemberProfileProps {
  member: ISpaceMember;
  spaceId: string;
  isCurrentUserOwner: boolean;
  onBack: () => void;
  onRemoved: () => void;
}

const PERMISSIONS: {
  key: keyof ISpaceMemberPermissions;
  label: string;
  description: string;
}[] = [
  {
    key: "canCreateBoards",
    label: "Создавать доски",
    description: "Участник может создавать новые доски",
  },
  {
    key: "canEditBoards",
    label: "Редактировать доски",
    description: "Участник может изменять содержимое досок",
  },
  {
    key: "canDraw",
    label: "Рисовать",
    description: "Участник может рисовать на досках",
  },
  {
    key: "canDeleteBoards",
    label: "Удалять доски",
    description: "Участник может удалять доски",
  },
];

// Сравнение permissions без object-identity.
function permsEqual(
  a: ISpaceMemberPermissions,
  b: ISpaceMemberPermissions,
): boolean {
  return (
    a.canCreateBoards === b.canCreateBoards &&
    a.canEditBoards === b.canEditBoards &&
    a.canDraw === b.canDraw &&
    a.canDeleteBoards === b.canDeleteBoards
  );
}

// Toggle-переключатель прав доступа в карточке участника.
function PermissionToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${active ? "bg-nova-blue" : "bg-gray-200"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${active ? "translate-x-4.5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

// Карточка члена с правами и опасной зоной (transfer/remove).
export function MemberProfile({
  member,
  spaceId,
  isCurrentUserOwner,
  onBack,
  onRemoved,
}: IMemberProfileProps) {
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const { mutate: updatePermissions, isPending: isUpdating } =
    useUpdateMemberPermissions();
  const { mutate: transferOwnership, isPending: isTransferring } =
    useTransferOwnership();

  const [confirmAction, setConfirmAction] = useState<
    "remove" | "transfer" | null
  >(null);

  const serverPerms: ISpaceMemberPermissions = {
    canCreateBoards: member.canCreateBoards,
    canEditBoards: member.canEditBoards,
    canDraw: member.canDraw,
    canDeleteBoards: member.canDeleteBoards,
  };

  const [localPerms, setLocalPerms] =
    useState<ISpaceMemberPermissions>(serverPerms);
  const [lastServerPerms, setLastServerPerms] =
    useState<ISpaceMemberPermissions>(serverPerms);

  // Sync local state с server-truth без cascading effect.
  if (!permsEqual(serverPerms, lastServerPerms)) {
    setLastServerPerms(serverPerms);
    setLocalPerms(serverPerms);
  }

  const displayName = member.user?.name || member.user?.email || "Пользователь";
  const displayEmail = member.user?.email || "";
  const initials = displayName.charAt(0).toUpperCase();
  const isOwner = member.role === "OWNER";
  const canEdit = isCurrentUserOwner && !isOwner;
  const isDirty = PERMISSIONS.some(
    ({ key }) => localPerms[key] !== serverPerms[key],
  );

  const handleSave = () => {
    updatePermissions({
      spaceId,
      targetUserId: member.userId,
      data: localPerms,
    });
  };

  const handleRemove = () => {
    removeMember(
      { spaceId, targetUserId: member.userId },
      {
        onSuccess: () => {
          setConfirmAction(null);
          onRemoved();
        },
      },
    );
  };

  const handleTransfer = () => {
    transferOwnership(
      { spaceId, targetUserId: member.userId },
      {
        onSuccess: () => {
          setConfirmAction(null);
          onBack();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <i className="fas fa-arrow-left text-xs" />
        Все участники
      </button>

      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        {member.user?.avatar ? (
          <img
            src={member.user.avatar}
            alt={displayName}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-nova-blue flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-semibold">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {displayName}
          </p>
          {displayEmail && (
            <p className="text-sm text-gray-400 truncate">{displayEmail}</p>
          )}
          <span
            className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${isOwner ? "bg-nova-blue/10 text-nova-blue" : "bg-gray-100 text-gray-500"}`}
          >
            {isOwner ? "Владелец" : "Участник"}
          </span>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-700">Права доступа</p>

          <div className="flex flex-col divide-y divide-gray-100">
            {PERMISSIONS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-gray-800">
                    {label}
                  </span>
                  <span className="text-xs text-gray-400">{description}</span>
                </div>
                <PermissionToggle
                  active={localPerms[key]}
                  onChange={() =>
                    setLocalPerms((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!isDirty || isUpdating}
              className="flex-1 py-2 rounded-lg bg-nova-blue text-white text-sm font-medium hover:bg-nova-blue/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              onClick={() => setLocalPerms(serverPerms)}
              disabled={!isDirty || isUpdating}
              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Опасная зона
          </p>

          {confirmAction === "transfer" ? (
            <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">
                Передать права владельца?
              </p>
              <p className="text-xs text-amber-700">
                {displayName} станет новым владельцем пространства. Вы будете
                понижены до участника и потеряете права владельца.
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isTransferring ? "Передача..." : "Да, передать"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isTransferring}
                  className="flex-1 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAction("transfer")}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-200 text-sm text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors w-full"
            >
              <i className="fas fa-crown text-xs" />
              Передать права владельца
            </button>
          )}

          {confirmAction === "remove" ? (
            <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                Удалить участника?
              </p>
              <p className="text-xs text-red-700">
                {displayName} потеряет доступ к пространству и всем его доскам.
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isRemoving ? "Удаление..." : "Да, удалить"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isRemoving}
                  className="flex-1 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAction("remove")}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors w-full"
            >
              <i className="fas fa-user text-xs" />
              Удалить участника
            </button>
          )}
        </div>
      )}
    </div>
  );
}
