"use client";
import { SubmitEventHandler, useCallback, useState } from "react";

import { IOTPStepProps } from "../../../interfaces/auth.interface";
import { OTP_LENGTH } from "../../../constants/auth.constant";
import { OTPInputGrid } from "./OTPInputGrid";
import { OTPTimer } from "./OTPTimer";

// Шаг ввода OTP-кода в auth-flow. Хранит код, валидирует длину и сабмитит.
export function OTPStep({
  email,
  onSubmit,
  onResend,
  onBack,
  isLoading,
  error,
}: IOTPStepProps) {
  const [code, setCode] = useState("");

  const handleChange = useCallback((currentCode: string) => {
    setCode(currentCode);
  }, []);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (code.length === OTP_LENGTH) {
      onSubmit(code);
    }
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight leading-none">
        Подтвердите{" "}
        <span className="relative">
          <span className="relative z-10">вход</span>
          <span className="absolute bottom-2 left-0 w-full h-2 bg-nova-yellow -z-0 opacity-70" />
        </span>
      </h1>

      <p className="text-gray-500 mb-12">
        Введите {OTP_LENGTH}-значный код, отправленный на
        <br />
        <span className="font-semibold text-gray-900">{email}</span>
      </p>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-6">
            Код подтверждения
          </label>

          <OTPInputGrid onChange={handleChange} disabled={isLoading} />

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <OTPTimer onResend={onResend} isLoading={isLoading} />
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== OTP_LENGTH}
          className="w-full bg-nova-dark text-white font-medium py-5 rounded-2xl text-lg transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Проверка..." : "Подтвердить"}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full bg-[#e2e2e27a] hover:bg-gray-200 text-gray-900 font-medium py-5 rounded-2xl text-lg transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          Назад
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-10">
        Проблемы со входом?{" "}
        <a href="#" className="text-gray-900 hover:underline">
          Свяжитесь с поддержкой
        </a>
      </p>
    </>
  );
}
