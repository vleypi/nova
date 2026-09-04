import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminSpacesService } from "../services/spaces.service";

// Mutation удаления пространства, инвалидирует spaces и boards (каскад).
export function useAdminDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminSpacesService.deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.SPACES });
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.BOARDS });
      toast.success("Пространство удалено");
    },
    onError: () => {
      toast.error("Не удалось удалить пространство");
    },
  });
}
