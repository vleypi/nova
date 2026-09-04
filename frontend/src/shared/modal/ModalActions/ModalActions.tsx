"use client";

export type TModalActionsVariant = "primary" | "danger";

interface IModalActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  confirmLabel: string;
  pendingLabel: string;
  confirmDisabled?: boolean;
  variant?: TModalActionsVariant;
}

const VARIANT_CLASS: Record<TModalActionsVariant, string> = {
  primary: "bg-nova-blue hover:bg-nova-blue/90",
  danger: "bg-red-500 hover:bg-red-600",
};

// Кнопки footer-а модалки: Отмена + Confirm с pending-состоянием.
export function ModalActions({
  onCancel,
  onConfirm,
  isPending,
  confirmLabel,
  pendingLabel,
  confirmDisabled,
  variant = "primary",
}: IModalActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
      >
        Отмена
      </button>
      <button
        onClick={onConfirm}
        disabled={isPending || confirmDisabled}
        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
      >
        {isPending ? pendingLabel : confirmLabel}
      </button>
    </div>
  );
}
