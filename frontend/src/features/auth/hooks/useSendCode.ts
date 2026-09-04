"use client";
import { RefObject } from "react";
import { useMutation } from "@tanstack/react-query";

import { authService } from "../services/auth.service";

// Мутация отправки кода на email. После успеха фиксирует email в ref
// и зовёт onCodeSent для перехода на следующий шаг.
export function useSendCode(
  onCodeSent: (email: string) => void,
  emailRef: RefObject<string>,
) {
  return useMutation({
    mutationFn: (email: string) => authService.sendAuthCode(email),
    onSuccess: (_, email) => {
      emailRef.current = email;
      onCodeSent(email);
    },
  });
}
