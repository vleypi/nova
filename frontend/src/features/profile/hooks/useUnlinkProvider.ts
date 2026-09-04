import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authService } from "@/features/auth";
import { ME_QUERY_KEY } from "@/shared/api/queryKeys";

// Отвязка OAuth-провайдера, обновляет ME-cache.
export function useUnlinkProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => authService.unlinkProvider(provider),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData([ME_QUERY_KEY], updatedUser);
      toast.success("Интеграция отключена");
    },
    onError: () => {
      toast.error("Не удалось отключить интеграцию");
    },
  });
}
