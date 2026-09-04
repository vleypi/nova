import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminUsersService } from "../services/users.service";
import { IAdminUsersParams } from "../interfaces/admin.interface";

// Query списка пользователей с пагинацией и фильтрами.
export function useAdminUsers(params?: IAdminUsersParams) {
  return useQuery({
    queryKey: [...ADMIN_QK.USERS, params],
    queryFn: () => adminUsersService.getUsers(params),
  });
}
