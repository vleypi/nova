"use client";
import { useOTPTimer } from "../../../hooks/useOTPTimer";
import { useResendCooldown } from "../../../hooks/useResendCooldown";

interface IOTPTimerProps {
  onResend: () => void;
  isLoading: boolean;
}

// Таймер истечения OTP и кнопка повторной отправки с cooldown.
export function OTPTimer({ onResend, isLoading }: IOTPTimerProps) {
  const { formatted, isExpired, restart } = useOTPTimer();
  const { cooldown, canResend, startCooldown } = useResendCooldown(isLoading);

  const handleResend = () => {
    if (!canResend) return;

    onResend();
    restart();
    startCooldown();
  };

  return (
    <div className="flex items-center justify-between text-sm">
      {!isExpired ? (
        <span className="text-gray-500">
          Код истекает через{" "}
          <span className="font-medium text-gray-900">{formatted}</span>
        </span>
      ) : (
        <span className="text-red-500 font-medium">Код истёк</span>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={!canResend}
        className="text-gray-900 hover:underline font-medium disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
      >
        {cooldown > 0 ? `Повторно через ${cooldown}с` : "Отправить снова"}
      </button>
    </div>
  );
}
