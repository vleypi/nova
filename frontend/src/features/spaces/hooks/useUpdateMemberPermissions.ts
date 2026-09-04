import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SPACE_MEMBERS_QUERY_KEY } from "@/shared/api/queryKeys";
import type { TUpdateMemberPermissionsDto } from "../interfaces/space.interface";
import { spaceService } from "../services/space.service";

// Обновление permissions участника, инвалидирует members этого space.
export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      targetUserId,
      data,
    }: {
      spaceId: string;
      targetUserId: string;
      data: TUpdateMemberPermissionsDto;
    }) => spaceService.updateMemberPermissions(spaceId, targetUserId, data),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [SPACE_MEMBERS_QUERY_KEY, spaceId],
      });
      toast.success("Права участника обновлены");
    },
    onError: () => {
      toast.error("Не удалось обновить права участника");
    },
  });
}
