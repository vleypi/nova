import { IAuthProvider } from "../interfaces/auth.interface";

export const AUTH_STEPS = {
  EMAIL: "email",
  OTP: "otp",
} as const;
export const OTP_LENGTH = 7;
export const OTP_TIMER_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;
// Сообщения ошибок auth-flow для показа пользователю.
export const AUTH_ERROR_MESSAGES = {
  INVALID_EMAIL: "Введите корректный email",
} as const;

export const AUTH_PROVIDERS_LIST: IAuthProvider[] = [
  {
    id: "google",
    name: "Google",
    icon: "/providers/google.svg",
    className: "bg-[#e2e2e27a] hover:bg-gray-200 text-gray-900",
    href: "/api/auth/google",
  },
  {
    id: "github",
    name: "GitHub",
    icon: "/providers/github.svg",
    className: "bg-[#e2e2e27a] hover:bg-gray-200 text-gray-900",
    href: "/api/auth/github",
  },
];
