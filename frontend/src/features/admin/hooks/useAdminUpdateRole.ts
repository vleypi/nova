import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminUsersService } from "../services/users.service";

// Mutation смены роли пользователя, инвалидирует список users.
export function useAdminUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminUsersService.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.USERS });
      toast.success("Роль обновлена");
    },
    onError: () => {
      toast.error("Не удалось обновить роль");
    },
  });
}
