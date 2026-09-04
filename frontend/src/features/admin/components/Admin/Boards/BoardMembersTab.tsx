"use client";
import { IUser } from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import type { ISpaceMember } from "@/features/spaces";
import { useAdminSpaceMembers } from "../../../hooks/useAdminSpaceMembers";
import { useAdminRealtime } from "../../../hooks/useAdminRealtime";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { IAdminBoard } from "../../../interfaces/admin.interface";
import { EditUserForm } from "../Users/EditUserForm";
import { EditBoardForm } from "./EditBoardForm";

interface IBoardMembersTabProps {
  board: IAdminBoard;
}

interface IMemberRowProps {
  member: ISpaceMember;
  isOnline: boolean;
  onClick: () => void;
}

// Таб «Участники»
export function BoardMembersTab({ board }: IBoardMembersTabProps) {
  const { data: members, isLoading: isLoadingMembers } = useAdminSpaceMembers(
    board.spaceId,
  );
  const { data: realtimeBoards, isLoading: isLoadingRealtime } =
    useAdminRealtime();
  const { data: usersList } = useAdminUsers({ limit: 10000 });
  const { openModal, closeModal } = useModal();

  if (isLoadingMembers || isLoadingRealtime) return <MembersSkeleton />;

  const onlineUsers =
    (realtimeBoards ?? []).find(
      (entry) => entry.boardId === board.id,
    )?.users ?? [];
  const onlineIds = new Set(onlineUsers.map((user) => user.id));

  const findUser = (userId: string): IUser | null =>
    usersList?.users.find((candidate) => candidate.id === userId) ?? null;

  const openUser = (userId: string) => {
    const fullUser = findUser(userId);
    if (!fullUser) return;
    const reopenBoard = () => {
      openModal(
        "Управление доской",
        <EditBoardForm
          board={board}
          onClose={closeModal}
          defaultTab="members"
        />,
        "xl",
        true,
        true,
      );
    };
    openModal(
      "Управление пользователем",
      <EditUserForm
        user={fullUser}
        onClose={closeModal}
        onBack={reopenBoard}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Сейчас на доске — {onlineUsers.length}
          </p>
        </div>
        {onlineUsers.length === 0 ? (
          <p className="text-sm text-gray-400 px-3 py-4 bg-gray-50 rounded-lg">
            Никого нет
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((user) => {
              const fullUser = findUser(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => openUser(user.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50/60 border border-green-100 rounded-lg hover:bg-green-50 transition"
                >
                  {fullUser ? (
                    <UserAvatar user={fullUser} size="xs" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                      ?
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {user.name || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Участники пространства — {members?.length ?? 0}
        </p>
        {!members?.length ? (
          <p className="text-sm text-gray-400 px-3 py-4 bg-gray-50 rounded-lg">
            Нет участников
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOnline={onlineIds.has(member.userId)}
                onClick={() => openUser(member.userId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Строка участника пространства с avatar, role-badge и online-статусом. См. AD10.
function MemberRow({ member, isOnline, onClick }: IMemberRowProps) {
  const user = member.user;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
    >
      <div className="relative flex-shrink-0">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
            {(user?.name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.name || "—"}
          </p>
          {member.role === "OWNER" && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-600 rounded">
              OWNER
            </span>
          )}
          {isOnline && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-50 text-green-600 rounded">
              ONLINE
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {user?.email ?? member.userId}
        </p>
      </div>

      <i className="fas fa-arrow-right text-[10px] text-gray-300" />
    </button>
  );
}

// Skeleton members-таба на время загрузки.
function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-20 bg-white border border-gray-100 rounded-lg animate-pulse" />
      <div className="h-64 bg-white border border-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}
