import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import type { ICreateSpaceDto } from "../interfaces/space.interface";
import { spaceService } from "../services/space.service";

// Создание space, инвалидирует список spaces.
export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ICreateSpaceDto) => spaceService.createSpace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPACES_QUERY_KEY] });
      toast.success("Пространство успешно создано");
    },
    onError: () => {
      toast.error("Не удалось создать пространство");
    },
  });
}
