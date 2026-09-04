import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminSpacesService } from "../services/spaces.service";
import { IAdminSpacesParams } from "../interfaces/admin.interface";

// Query списка пространств админки с пагинацией и фильтрами.
export function useAdminSpaces(params?: IAdminSpacesParams) {
  return useQuery({
    queryKey: [...ADMIN_QK.SPACES, params],
    queryFn: () => adminSpacesService.getSpaces(params),
  });
}
