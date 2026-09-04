"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/utils/service.util";
import { getSpaceUrl } from "@/shared/config/routes.constant";
import { useJoinByInviteCode } from "./useJoinByInviteCode";

// Auto-join по invite. На 409 backend возвращает spaceId для редиректа.
export function useJoinSpace(inviteCode: string) {
  const router = useRouter();
  const { mutate: join, isPending, isError, error } = useJoinByInviteCode();

  useEffect(() => {
    join(inviteCode, {
      onSuccess: (space) => {
        router.replace(getSpaceUrl(space.id));
      },
      onError: (err) => {
        if (!(err instanceof ApiError) || err.statusCode !== 409) return;
        const spaceId = err.data?.spaceId as string | undefined;
        if (spaceId) router.replace(getSpaceUrl(spaceId));
      },
    });
  }, [inviteCode, join, router]);

  // 409 не показываем как ошибку UI, сразу редирект внутри onError.
  const isAlreadyMember =
    isError && error instanceof ApiError && error.statusCode === 409;

  return {
    isPending: isPending || isAlreadyMember,
    isError: isError && !isAlreadyMember,
    error,
  };
}
