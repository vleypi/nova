import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminUsersService } from "../services/users.service";

// Mutation блокировки/разблокировки пользователя, инвалидирует список users.
export function useAdminBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      adminUsersService.blockUser(id, isBlocked),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QK.USERS });
      toast.success(
        variables.isBlocked
          ? "Пользователь заблокирован"
          : "Пользователь разблокирован",
      );
    },
    onError: () => {
      toast.error("Не удалось изменить статус");
    },
  });
}
