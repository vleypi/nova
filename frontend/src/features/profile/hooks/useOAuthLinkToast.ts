"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ME_QUERY_KEY } from "@/shared/api/queryKeys";

const ERROR_MESSAGES: Record<string, string> = {
  already_linked: "Этот аккаунт уже привязан к другому пользователю Nova",
  link_failed: "Не удалось привязать аккаунт. Попробуйте ещё раз",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  google_success: "Google успешно подключён",
  github_success: "GitHub успешно подключён",
};

// Toast-уведомления после OAuth-link редиректа.
export function useOAuthLinkToast() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("link");
    const errorCode = searchParams.get("linkError");
    if (!success && !errorCode) return;

    if (success && SUCCESS_MESSAGES[success]) {
      toast.success(SUCCESS_MESSAGES[success]);
      queryClient.invalidateQueries({ queryKey: [ME_QUERY_KEY] });
    } else if (errorCode) {
      toast.error(ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.link_failed);
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("link");
    next.delete("linkError");
    next.delete("provider");

    const queryString = next.toString();
    const href = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(href, { scroll: false });
  }, [searchParams, router, queryClient]);
}
