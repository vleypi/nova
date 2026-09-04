import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SPACE_MEMBERS_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Удаление участника space, инвалидирует members этого space.
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      targetUserId,
    }: {
      spaceId: string;
      targetUserId: string;
    }) => spaceService.removeMember(spaceId, targetUserId),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [SPACE_MEMBERS_QUERY_KEY, spaceId],
      });
      toast.success("Участник удалён");
    },
    onError: () => {
      toast.error("Не удалось удалить участника");
    },
  });
}
