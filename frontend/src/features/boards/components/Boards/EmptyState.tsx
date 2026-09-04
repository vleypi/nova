import { ReactNode } from "react";

interface IEmptyStateProps {
  iconBgClass: string;
  iconColorClass: string;
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}

// Базовый layout пустого состояния: иконка, заголовок, описание, опциональные действия.
export function EmptyState({
  iconBgClass,
  iconColorClass,
  icon,
  title,
  description,
  actions,
}: IEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
      <div
        className={`w-20 h-20 ${iconBgClass} rounded-2xl flex items-center justify-center mb-6`}
      >
        <span
          className={`w-10 h-10 ${iconColorClass} flex items-center justify-center`}
        >
          {icon}
        </span>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-8">{description}</p>

      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
