"use client";
import { IUser } from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import type { ISpaceMember } from "@/features/spaces";
import { useAdminSpaceMembers } from "../../../hooks/useAdminSpaceMembers";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { IAdminSpace } from "../../../interfaces/admin.interface";
import { EditUserForm } from "../Users/EditUserForm";
import { EditSpaceForm } from "./EditSpaceForm";

interface ISpaceMembersTabProps {
  space: IAdminSpace;
}

interface IMemberRowProps {
  member: ISpaceMember;
  onClick: () => void;
}

// Таб «Участники» admin-карточки space с навигацией в карточку пользователя
export function SpaceMembersTab({ space }: ISpaceMembersTabProps) {
  const { data: members, isLoading } = useAdminSpaceMembers(space.id);
  const { data: usersList } = useAdminUsers({ limit: 10000 });
  const { openModal, closeModal } = useModal();

  if (isLoading) return <MembersSkeleton />;

  const openUser = (userId: string, fallbackName?: string) => {
    const fresh = usersList?.users.find(
      (candidate) => candidate.id === userId,
    );
    const userForModal: IUser = fresh ?? {
      id: userId,
      email: "",
      name: fallbackName ?? "",
      role: "USER",
      isBlocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const reopenSpace = () => {
      openModal(
        "Управление пространством",
        <EditSpaceForm
          space={space}
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
        user={userForModal}
        onClose={closeModal}
        onBack={reopenSpace}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Участники — {members?.length ?? 0}
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
              onClick={() => openUser(member.userId, member.user?.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Строка участника пространства с avatar, role-badge. См. AD10.
function MemberRow({ member, onClick }: IMemberRowProps) {
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
    <div className="h-64 bg-white border border-gray-100 rounded-lg animate-pulse" />
  );
}
