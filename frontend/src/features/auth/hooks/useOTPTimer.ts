"use client";
import { useState, useEffect, useCallback, useRef } from "react";

import { OTP_TIMER_SECONDS } from "../constants/auth.constant";
import { IUseOTPTimerReturn } from "../interfaces/auth.interface";
import { formatTimer } from "../utils/auth.util";

// Таймер истечения OTP-кода. Тикает по секунде, останавливается на 0.
// restart сбрасывает к полному времени и перезапускает интервал.
export function useOTPTimer(): IUseOTPTimerReturn {
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stop();

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stop]);

  const restart = useCallback(() => {
    setTimeLeft(OTP_TIMER_SECONDS);
    startInterval();
  }, [startInterval]);

  useEffect(() => {
    startInterval();
    return stop;
  }, [startInterval, stop]);

  return {
    timeLeft,
    formatted: formatTimer(timeLeft),
    isExpired: timeLeft === 0,
    restart,
  };
}
