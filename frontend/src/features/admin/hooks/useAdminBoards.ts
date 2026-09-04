import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminBoardsService } from "../services/boards.service";
import { IAdminBoardsParams } from "../interfaces/admin.interface";

// Query списка досок админки с пагинацией и фильтрами.
export function useAdminBoards(params?: IAdminBoardsParams) {
  return useQuery({
    queryKey: [...ADMIN_QK.BOARDS, params],
    queryFn: () => adminBoardsService.getBoards(params),
  });
}
