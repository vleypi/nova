interface ISpacesHeaderProps {
  onOpen: () => void;
}

// Заголовок sidebar-секции пространств с кнопкой создания.
export function SpacesHeader({ onOpen }: ISpacesHeaderProps) {
  return (
    <div className="pl-3 mb-2 flex items-center justify-between">
      <h3 className="flex-1 min-w-0 truncate text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Пространства
      </h3>
      <button
        className="spaces-create-btn w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-nova-blue hover:bg-blue-50 transition flex-shrink-0"
        title="Создать пространство"
        onClick={onOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
