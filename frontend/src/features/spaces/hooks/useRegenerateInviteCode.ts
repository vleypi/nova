import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Перегенерация invite-кода space, инвалидирует список spaces.
export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spaceId: string) => spaceService.regenerateInviteCode(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
      toast.success("Инвайт-код обновлён");
    },
    onError: () => {
      toast.error("Не удалось обновить инвайт-код");
    },
  });
}
