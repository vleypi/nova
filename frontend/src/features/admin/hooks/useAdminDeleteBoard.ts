import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminBoardsService } from "../services/boards.service";

// Mutation удаления доски, инвалидирует список boards.
export function useAdminDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminBoardsService.deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.BOARDS });
      toast.success("Доска удалена");
    },
    onError: () => {
      toast.error("Не удалось удалить доску");
    },
  });
}
