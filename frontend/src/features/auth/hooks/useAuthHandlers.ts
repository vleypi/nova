"use client";
import { useRef } from "react";

import { IUseAuthHandlersReturn } from "../interfaces/auth.interface";
import { useResendCode } from "./useResendCode";
import { useSendCode } from "./useSendCode";
import { useVerifyCode } from "./useVerifyCode";

// Композиция трёх auth-мутаций (send/verify/resend) с общим emailRef.
// emailRef нужен потому что resend и verify работают с email из прошлого
// шага. Возвращает агрегированные isLoading и error любой из мутаций.
export function useAuthHandlers(
  onCodeSent: (email: string) => void,
  onVerified: () => void,
): IUseAuthHandlersReturn {
  const emailRef = useRef("");

  const sendCode = useSendCode(onCodeSent, emailRef);
  const verifyCode = useVerifyCode(emailRef, onVerified);
  const resendCode = useResendCode(emailRef);

  const isLoading =
    sendCode.isPending || verifyCode.isPending || resendCode.isPending;

  const error =
    sendCode.error?.message ??
    verifyCode.error?.message ??
    resendCode.error?.message ??
    null;

  return {
    handleSendCode: sendCode.mutate,
    handleVerifyCode: verifyCode.mutate,
    handleResendCode: resendCode.handleResendCode,
    isLoading,
    error,
  };
}
