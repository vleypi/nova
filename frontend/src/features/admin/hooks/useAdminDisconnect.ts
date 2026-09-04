import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminRealtimeService } from "../services/realtime.service";

// Mutation отключения пользователя, инвалидирует realtime.
export function useAdminDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminRealtimeService.disconnectUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.REALTIME });
      toast.success("Пользователь отключён");
    },
    onError: () => {
      toast.error("Не удалось отключить");
    },
  });
}
