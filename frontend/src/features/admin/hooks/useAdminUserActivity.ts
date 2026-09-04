import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminUsersService } from "../services/users.service";

// Query статистики активности пользователя по id.
export function useAdminUserActivity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_QK.USER_ACTIVITY, id],
    queryFn: () => adminUsersService.getUserActivity(id),
    enabled: enabled && !!id,
  });
}
