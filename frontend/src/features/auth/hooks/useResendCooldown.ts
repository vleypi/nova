"use client";
import { useState, useCallback, useEffect, useRef } from "react";

import { RESEND_COOLDOWN_SECONDS } from "../constants/auth.constant";
import { IUseResendCooldownReturn } from "../interfaces/auth.interface";

// Кулдаун между запросами повторной отправки кода. Хранит остаток секунд
// и блокирует resend пока не истёк или пока идёт другой запрос.
export function useResendCooldown(
  isLoading: boolean,
): IUseResendCooldownReturn {
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(() => {
    stop();
    setCooldown(RESEND_COOLDOWN_SECONDS);

    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    cooldown,
    canResend: cooldown === 0 && !isLoading,
    startCooldown,
  };
}
