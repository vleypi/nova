"use client";

interface IAdminPageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

// Заголовок admin-страницы
export function AdminPageHeader({
  title,
  description,
  actions,
}: IAdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
