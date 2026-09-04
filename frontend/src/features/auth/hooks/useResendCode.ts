"use client";
import { RefObject } from "react";
import { useMutation } from "@tanstack/react-query";

import { authService } from "../services/auth.service";

// Мутация повторной отправки кода. Использует email из ref,
// без него no-op.
export function useResendCode(emailRef: RefObject<string>) {
  const mutation = useMutation({
    mutationFn: () => authService.sendAuthCode(emailRef.current),
  });

  const handleResendCode = () => {
    if (!emailRef.current) return;

    mutation.mutate();
  };

  return { ...mutation, handleResendCode };
}
