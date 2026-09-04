"use client";
import { RefObject } from "react";
import { useMutation } from "@tanstack/react-query";

import { authService } from "../services/auth.service";

// Мутация верификации OTP-кода. После успеха зовёт onVerified.
export function useVerifyCode(
  emailRef: RefObject<string>,
  onVerified: () => void,
) {
  return useMutation({
    mutationFn: (code: string) =>
      authService.verifyAuthCode(emailRef.current, code),
    onSuccess: () => onVerified(),
  });
}
