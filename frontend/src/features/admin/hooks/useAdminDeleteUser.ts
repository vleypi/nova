import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminUsersService } from "../services/users.service";

// Mutation удаления пользователя, инвалидирует список users.
export function useAdminDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminUsersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.USERS });
      toast.success("Пользователь удалён");
    },
    onError: () => {
      toast.error("Не удалось удалить пользователя");
    },
  });
}
