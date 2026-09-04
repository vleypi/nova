import { ISelectProps } from "./select.types";

// Стрелка-индикатор для select-кнопки.
function SelectArrow() {
  return (
    <svg
      className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-1.5 pointer-events-none"
      viewBox="0 0 10 6"
      fill="none"
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Базовый Select с кастомной стрелкой и nova-blue фокусом.
export function Select({
  options,
  value,
  onChange,
  className = "",
}: ISelectProps) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={`appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-nova-blue focus:border-transparent cursor-pointer ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <SelectArrow />
    </div>
  );
}
