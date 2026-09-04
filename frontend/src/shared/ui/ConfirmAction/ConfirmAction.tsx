"use client";
import { useState, type ReactNode } from "react";

const COLOR_MAP = {
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    trigger: "text-red-600 border-red-200 hover:bg-red-50",
    confirm: "bg-red-500 hover:bg-red-600",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    trigger: "text-orange-600 border-orange-200 hover:bg-orange-50",
    confirm: "bg-orange-500 hover:bg-orange-600",
  },
} as const;

export type TConfirmActionColor = keyof typeof COLOR_MAP;

interface IConfirmActionProps {
  label: string;
  confirmText: string;
  confirmLabel: string;
  pendingLabel: string;
  color: TConfirmActionColor;
  icon: ReactNode;
  isPending: boolean;
  onConfirm: () => void;
}

// Кнопка с inline-confirm: первый клик показывает текст подтверждения, второй вызывает onConfirm.
export function ConfirmAction({
  label,
  confirmText,
  confirmLabel,
  pendingLabel,
  color,
  icon,
  isPending,
  onConfirm,
}: IConfirmActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const styles = COLOR_MAP[color];

  if (isOpen) {
    return (
      <div
        className={`flex items-center justify-between rounded-lg ${styles.bg} ${styles.border} border px-4 py-3`}
      >
        <p className={`text-sm ${styles.text}`}>{confirmText}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition ${styles.confirm}`}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm border rounded-lg disabled:opacity-50 transition ${styles.trigger}`}
    >
      {icon}
      {label}
    </button>
  );
}
