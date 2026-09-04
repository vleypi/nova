"use client";
import { useState } from "react";
import { useMe } from "@/shared/identity";
import type { ISpaceMember } from "../../interfaces/space.interface";
import { useSpaceMembers } from "../../hooks/useSpaceMembers";
import { MemberProfile } from "./MemberProfile";

interface ISpaceMembersListProps {
  spaceId: string;
  ownerId: string;
}

interface IMemberRowProps {
  member: ISpaceMember;
  isMe: boolean;
  onClick: () => void;
}

// Skeleton одной строки списка участников.
function MemberSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-32 bg-gray-100 rounded" />
        <div className="h-2.5 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-14 bg-gray-100 rounded-full" />
    </div>
  );
}

// Строка списка участников с avatar, role-badge и стрелкой.
function MemberRow({ member, isMe, onClick }: IMemberRowProps) {
  const displayName = member.user?.name || member.user?.email || "Пользователь";
  const displayEmail = member.user?.email || "";
  const initials = displayName.charAt(0).toUpperCase();
  const isOwner = member.role === "OWNER";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors group"
    >
      {member.user?.avatar ? (
        <img
          src={member.user.avatar}
          alt={displayName}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-nova-blue flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-semibold">{initials}</span>
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </p>
        {displayEmail && (
          <p className="text-xs text-gray-400 truncate">{displayEmail}</p>
        )}
      </div>

      {isMe && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">
          Вы
        </span>
      )}

      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isOwner ? "bg-nova-blue/10 text-nova-blue" : "bg-gray-100 text-gray-500"}`}
      >
        {isOwner ? "Владелец" : "Участник"}
      </span>

      <i className="fas fa-chevron-right text-xs text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
    </button>
  );
}

// Список участников space с переходом в детальную карточку.
export function SpaceMembersList({
  spaceId,
  ownerId,
}: ISpaceMembersListProps) {
  const { data: members, isLoading, isError } = useSpaceMembers(spaceId);
  const { data: me } = useMe();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const isCurrentUserOwner = me?.id === ownerId;
  const selectedMember =
    members?.find((member) => member.id === selectedMemberId) ?? null;

  if (selectedMember) {
    return (
      <MemberProfile
        member={selectedMember}
        spaceId={spaceId}
        isCurrentUserOwner={isCurrentUserOwner}
        onBack={() => setSelectedMemberId(null)}
        onRemoved={() => setSelectedMemberId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-700">
        Участники{members ? ` · ${members.length}` : ""}
      </p>

      <div className="flex flex-col">
        {isLoading && (
          <>
            <MemberSkeleton />
            <MemberSkeleton />
            <MemberSkeleton />
          </>
        )}
        {isError && (
          <p className="text-sm text-red-500 py-2">
            Не удалось загрузить участников
          </p>
        )}

        {members?.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isMe={member.userId === me?.id}
            onClick={() => setSelectedMemberId(member.id)}
          />
        ))}
      </div>
    </div>
  );
}
