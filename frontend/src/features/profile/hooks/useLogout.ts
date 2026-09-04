"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth";
import { ME_QUERY_KEY } from "@/shared/api/queryKeys";
import { AUTH_ROUTE } from "@/shared/config/proxy.constant";

interface IUseLogoutOptions {
  onLoggedOut?: () => void;
  redirectTo?: string;
}

// Logout-мутация. По завершении (успех или ошибка) чистит ME-cache, зовёт
// onLoggedOut callback и редиректит на redirectTo (по умолчанию AUTH_ROUTE).
// onSettled вместо onSuccess — authService.logout() в catch уже чистит localStorage,
// поэтому даже при сетевой ошибке логично сбросить клиентский state.
export function useLogout({
  onLoggedOut,
  redirectTo = AUTH_ROUTE,
}: IUseLogoutOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: [ME_QUERY_KEY] });
      onLoggedOut?.();
      router.push(redirectTo);
    },
  });
}
