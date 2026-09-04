import { useQuery } from "@tanstack/react-query";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Все доступные пользователю пространства.
export function useSpaces() {
  return useQuery({
    queryKey: [SPACES_QUERY_KEY],
    queryFn: () => spaceService.getSpaces(),
  });
}
