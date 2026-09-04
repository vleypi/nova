import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Чистая mutation. Toast и redirect делает caller useJoinSpace.
export function useJoinByInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => spaceService.joinByInviteCode(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
    },
  });
}
