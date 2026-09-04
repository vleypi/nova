import { OTP_LENGTH } from "../constants/auth.constant";

// Валидация email по простой ASCII-форме local@domain.tld.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Форматирует число секунд в M:SS. Часы не покрывает (для OTP не нужно).
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Возвращает только цифры из строки, обрезая до OTP_LENGTH. Для paste-handler.
export function extractDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}
