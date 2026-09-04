"use client";
import { ConfirmAction } from "@/shared/ui/ConfirmAction/ConfirmAction";
import { useLogout } from "../../hooks/useLogout";

interface IProfileDangerZoneProps {
  onLoggedOut: () => void;
}

// Таб «Опасная зона»: logout с подтверждением.
export function ProfileDangerZone({ onLoggedOut }: IProfileDangerZoneProps) {
  const { mutate: logout, isPending } = useLogout({ onLoggedOut });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Опасная зона
      </p>

      <ConfirmAction
        label="Выйти из аккаунта"
        confirmText="Завершить текущую сессию?"
        confirmLabel="Да, выйти"
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
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        }
        isPending={isPending}
        onConfirm={() => logout()}
      />
    </div>
  );
}
