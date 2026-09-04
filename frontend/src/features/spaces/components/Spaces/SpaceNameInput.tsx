"use client";
import { ReactNode, useId } from "react";

interface ISpaceNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  placeholder?: string;
  inlineAction?: ReactNode;
}

// Controlled input для названия space, опционально с inline-кнопкой справа.
export function SpaceNameInput({
  value,
  onChange,
  disabled,
  error,
  autoFocus,
  placeholder,
  inlineAction,
}: ISpaceNameInputProps) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-nova-dark">
        Название
      </label>
      <div className={inlineAction ? "flex gap-2" : ""}>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${inlineAction ? "flex-1" : "w-full"} px-3 py-2 rounded-lg border border-nova-gray text-sm outline-none focus:border-nova-blue transition disabled:opacity-50`}
          autoFocus={autoFocus}
          disabled={disabled}
        />
        {inlineAction}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
