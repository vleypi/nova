import { useQuery } from "@tanstack/react-query";
import { FAVORITE_BOARDS_QUERY_KEY } from "@/shared/api/queryKeys";
import { boardService } from "../services/board.service";

// Query списка избранных досок текущего пользователя.
export function useFavoriteBoards() {
  return useQuery({
    queryKey: [FAVORITE_BOARDS_QUERY_KEY],
    queryFn: () => boardService.getFavoriteBoards(),
  });
}
