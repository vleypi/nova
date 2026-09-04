"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PROTECTED_ROUTE } from "@/shared/config/proxy.constant";
import { STORAGE_KEYS } from "@/shared/config/storage-keys.constant";

// Редирект после успешной верификации auth.
// Сначала pending-target из sessionStorage, иначе дефолтный маршрут.
export function useAuthRedirect(): { handleVerified: () => void } {
  const router = useRouter();
  
  const handleVerified = useCallback(() => {
    const pending = sessionStorage.getItem(STORAGE_KEYS.PENDING_REDIRECT);
    if (pending) {
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_REDIRECT);
      router.push(pending);
      return;
    }
    router.push(DEFAULT_PROTECTED_ROUTE);
  }, [router]);
  return { handleVerified };
}
