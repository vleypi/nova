"use client";
import { OTP_LENGTH } from "../../../constants/auth.constant";
import { useOTPInput } from "../../../hooks/useOTPInput";

interface IOTPInputGridProps {
  onChange: (code: string) => void;
  disabled?: boolean;
}

// Сетка из OTP_LENGTH input-полей. Логика ввода и навигации в useOTPInput.
export function OTPInputGrid({ onChange, disabled }: IOTPInputGridProps) {
  const { values, setRef, handleChange, handleKeyDown, handlePaste } =
    useOTPInput(onChange);

  return (
    <div
      className="grid gap-3 mb-8"
      style={{ gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: OTP_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={setRef(index)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]"
          required
          autoFocus={index === 0}
          disabled={disabled}
          value={values[index]}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          className="aspect-square text-center text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:ring-0 focus:outline-none transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );
}
