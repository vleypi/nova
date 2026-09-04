import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SPACES_QUERY_KEY,
  BOARDS_QUERY_KEY,
  FAVORITE_BOARDS_QUERY_KEY,
} from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Покинуть space, инвалидирует список spaces и boards (включая избранные).
export function useLeaveSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spaceId: string) => spaceService.leaveSpace(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [FAVORITE_BOARDS_QUERY_KEY] });
      toast.success("Вы покинули пространство");
    },
    onError: () => {
      toast.error("Не удалось покинуть пространство");
    },
  });
}
