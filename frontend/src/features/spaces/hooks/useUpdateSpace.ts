import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import type { IUpdateSpaceDto } from "../interfaces/space.interface";
import { spaceService } from "../services/space.service";

// Обновление space по id.
export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      data,
    }: {
      spaceId: string;
      data: IUpdateSpaceDto;
    }) => spaceService.updateSpace(spaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
      toast.success("Пространство обновлено");
    },
    onError: () => {
      toast.error("Не удалось обновить пространство");
    },
  });
}
