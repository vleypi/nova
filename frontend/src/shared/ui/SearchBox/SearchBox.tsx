"use client";
import { useEffect, useState, type KeyboardEvent } from "react";

interface ISearchBoxProps {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Search-input с draft-state, Enter-submit и кнопкой clear.
export function SearchBox({
  value,
  onSearch,
  placeholder,
  className,
}: ISearchBoxProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const submit = () => onSearch(draft.trim());

  const clear = () => {
    setDraft("");
    onSearch("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={`relative ${className ?? "w-64"}`}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-3 pr-16 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-nova-blue/30 focus:border-nova-blue"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Очистить"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={submit}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-nova-blue hover:bg-gray-50 rounded-md transition"
        aria-label="Найти"
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
            strokeWidth={2}
            d="M21 21l-4.35-4.35M10 17a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
      </button>
    </div>
  );
}
