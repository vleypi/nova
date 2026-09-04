import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SPACES_QUERY_KEY,
  SPACE_MEMBERS_QUERY_KEY,
} from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Передача владения space, инвалидирует список spaces и members.
export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      targetUserId,
    }: {
      spaceId: string;
      targetUserId: string;
    }) => spaceService.transferOwnership(spaceId, { targetUserId }),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [SPACE_MEMBERS_QUERY_KEY, spaceId],
      });
      toast.success("Права владельца переданы");
    },
    onError: () => {
      toast.error("Не удалось передать права владельца");
    },
  });
}
