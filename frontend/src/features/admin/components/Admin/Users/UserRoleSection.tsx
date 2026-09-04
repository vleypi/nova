"use client";
import { useState } from "react";
import {
  IUser,
  TUserRole,
  ROLES_ORDERED,
  ROLE_HIERARCHY,
  ROLE_LABELS_FULL,
  ROLE_DESCRIPTIONS,
  ROLE_BADGE_CLASSES,
} from "@/shared/identity";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import { useAdminUpdateRole } from "../../../hooks/useAdminUpdateRole";

interface IUserRoleSectionProps {
  user: IUser;
  me: IUser;
  isSelf: boolean;
}

interface IRoleSectionProps {
  children: React.ReactNode;
}

interface ICurrentRoleDisplayProps {
  role: TUserRole;
}

interface ILockedNoticeProps {
  variant: "info" | "warning";
  title: string;
  message: string;
}

// Секция управления ролью пользователя с radio-выбором и confirm-применение
export function UserRoleSection({ user, me, isSelf }: IUserRoleSectionProps) {
  const [selectedRole, setSelectedRole] = useState<TUserRole>(user.role);

  const { mutate: updateRole, isPending } = useAdminUpdateRole();

  const actorLevel = ROLE_HIERARCHY[me.role];
  const targetLevel = ROLE_HIERARCHY[user.role];
  const isSuperAdmin = me.role === "SUPER_ADMIN";
  const targetOutOfReach = !isSuperAdmin && targetLevel >= actorLevel;

  if (isSelf) {
    return (
      <RoleSection>
        <LockedNotice
          variant="info"
          title="Вы не можете изменить собственную роль"
          message="Для изменения роли обратитесь к супер-администратору."
        />
        <CurrentRoleDisplay role={user.role} />
      </RoleSection>
    );
  }

  if (targetOutOfReach) {
    return (
      <RoleSection>
        <LockedNotice
          variant="warning"
          title="Недостаточно прав"
          message="У этого пользователя роль равная или выше вашей. Вы не можете изменить её."
        />
        <CurrentRoleDisplay role={user.role} />
      </RoleSection>
    );
  }

  const assignableRoles = ROLES_ORDERED.filter((role) =>
    isSuperAdmin ? true : ROLE_HIERARCHY[role] < actorLevel,
  );
  const hasChanged = selectedRole !== user.role;

  return (
    <RoleSection>
      <div>
        <p className="text-sm font-medium text-gray-700">Роль</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Текущая роль:{" "}
          <span
            className={`px-1.5 py-0.5 text-xs font-medium rounded ${ROLE_BADGE_CLASSES[user.role]}`}
          >
            {ROLE_LABELS_FULL[user.role]}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {assignableRoles.map((role) => {
          const isSelected = selectedRole === role;
          const isCurrent = user.role === role;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              disabled={isPending}
              className={`
                flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? "border-nova-blue bg-nova-blue/5 ring-1 ring-nova-blue/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <div
                className={`
                w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                ${isSelected ? "border-nova-blue" : "border-gray-300"}
              `}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-nova-blue" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {ROLE_LABELS_FULL[role]}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                      текущая
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {hasChanged && (
        <ConfirmAction
          label={`Применить роль: ${ROLE_LABELS_FULL[selectedRole]}`}
          confirmText={`Изменить роль с «${ROLE_LABELS_FULL[user.role]}» на «${ROLE_LABELS_FULL[selectedRole]}»?`}
          confirmLabel="Да, изменить"
          pendingLabel="Изменение..."
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
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
          isPending={isPending}
          onConfirm={() => updateRole({ id: user.id, role: selectedRole })}
        />
      )}
    </RoleSection>
  );
}

// Контейнер role-секции с вертикальным gap.
function RoleSection({ children }: IRoleSectionProps) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

// Отображение текущей роли в read-only режиме.
function CurrentRoleDisplay({ role }: ICurrentRoleDisplayProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/50">
      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {ROLE_LABELS_FULL[role]}
          </span>
          <span
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${ROLE_BADGE_CLASSES[role]}`}
          >
            текущая
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {ROLE_DESCRIPTIONS[role]}
        </p>
      </div>
    </div>
  );
}

// Notice-блок для сценариев, где изменение роли заблокировано (дубль с UserDangerZone, см. AD7).
function LockedNotice({ variant, title, message }: ILockedNoticeProps) {
  const styles =
    variant === "info"
      ? {
          bg: "bg-blue-50/50",
          border: "border-blue-100",
          icon: "text-blue-500",
          title: "text-blue-900",
          text: "text-blue-700",
        }
      : {
          bg: "bg-amber-50/50",
          border: "border-amber-100",
          icon: "text-amber-500",
          title: "text-amber-900",
          text: "text-amber-700",
        };
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 border ${styles.border} ${styles.bg} rounded-lg`}
    >
      <svg
        className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className={`text-sm font-medium ${styles.title}`}>{title}</p>
        <p className={`text-xs ${styles.text} mt-0.5`}>{message}</p>
      </div>
    </div>
  );
}
