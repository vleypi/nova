"use client";
import {
  useState,
  useCallback,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
  ChangeEvent,
} from "react";

import { OTP_LENGTH } from "../constants/auth.constant";
import { extractDigits } from "../utils/auth.util";

// State и handlers для сетки OTP-input-полей. Ввод цифр, навигация
// клавиатурой, paste из буфера. Подключается к каждому input по index.
export function useOTPInput(onChange: (code: string) => void) {
  const [values, setValues] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (element: HTMLInputElement | null) => {
      inputsRef.current[index] = element;
    },
    [],
  );

  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
  }, []);

  const updateValues = useCallback(
    (newValues: string[]) => {
      setValues(newValues);
      onChange(newValues.join(""));
    },
    [onChange],
  );

  const handleChange = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      const digit = event.target.value.replace(/\D/g, "").slice(-1);
      const newValues = [...values];
      newValues[index] = digit;
      updateValues(newValues);

      if (digit && index < OTP_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [values, updateValues, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace") {
        if (values[index]) {
          const newValues = [...values];
          newValues[index] = "";
          updateValues(newValues);
        } else if (index > 0) {
          focusInput(index - 1);
          const newValues = [...values];
          newValues[index - 1] = "";
          updateValues(newValues);
        }
        event.preventDefault();
      }

      if (event.key === "ArrowLeft" && index > 0) {
        focusInput(index - 1);
      }

      if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [values, updateValues, focusInput],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();

      const digits = extractDigits(event.clipboardData.getData("text"));
      if (!digits) return;

      const newValues = [...values];
      for (let index = 0; index < digits.length && index < OTP_LENGTH; index++) {
        newValues[index] = digits[index];
      }
      updateValues(newValues);
      focusInput(Math.min(digits.length, OTP_LENGTH - 1));
    },
    [values, updateValues, focusInput],
  );

  return {
    values,
    setRef,
    handleChange,
    handleKeyDown,
    handlePaste,
  };
}
