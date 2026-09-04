import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminRealtimeService } from "../services/realtime.service";

// Mutation broadcast-сообщения всем пользователям.
export function useAdminBroadcast() {
  return useMutation({
    mutationFn: ({ message, type }: { message: string; type: string }) =>
      adminRealtimeService.broadcast(message, type),
    onSuccess: () => {
      toast.success("Сообщение отправлено");
    },
    onError: () => {
      toast.error("Не удалось отправить");
    },
  });
}
