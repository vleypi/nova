"use client";
import { SubmitEventHandler, useState } from "react";

import { AUTH_ERROR_MESSAGES } from "../../../constants/auth.constant";
import { IEmailStepProps } from "../../../interfaces/auth.interface";
import { isValidEmail } from "../../../utils/auth.util";
import { OAuthProviderList } from "./OAuthProviderList";

export function EmailStep({ onSubmit, isLoading, error }: IEmailStepProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayError = error ?? validationError;

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setValidationError(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setValidationError(AUTH_ERROR_MESSAGES.INVALID_EMAIL);
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-gray-900 mb-12 tracking-tight leading-none">
        Введите почту для входа или{" "}
        <span className="relative">
          <span className="relative z-10">регистрации</span>
          <span className="absolute bottom-2 left-0 w-full h-2 bg-nova-yellow -z-0 opacity-70" />
        </span>
      </h1>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4"
          >
            Email адрес
          </label>

          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setValidationError(null);
            }}
            placeholder="name@company.com"
            className="w-full bg-transparent border-none p-0 text-3xl font-medium text-gray-900 placeholder:text-gray-200 focus:ring-0 focus:outline-none transition-colors"
            required
            autoFocus
            disabled={isLoading}
          />

          {displayError && (
            <p className="mt-3 text-sm text-red-500">{displayError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-nova-dark text-white font-medium py-5 rounded-2xl text-lg transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Отправка..." : "Продолжить"}
        </button>
      </form>

      <OAuthProviderList />

      <p className="text-xs text-gray-400 mt-10">
        Продолжая, вы соглашаетесь с{" "}
        <a href="#" className="text-gray-900 hover:underline">
          Условиями
        </a>{" "}
        и{" "}
        <a href="#" className="text-gray-900 hover:underline">
          Политикой
        </a>
      </p>
    </>
  );
}
