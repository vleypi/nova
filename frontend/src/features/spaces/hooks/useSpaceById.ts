import { useQuery } from "@tanstack/react-query";
import { SPACES_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Один space по id из общего cache spaces. Без отдельного network-запроса
// если useSpaces уже подгрузил список.
export function useSpaceById(spaceId: string) {
  return useQuery({
    queryKey: [SPACES_QUERY_KEY],
    queryFn: () => spaceService.getSpaces(),
    select: (spaces) => spaces.find((space) => space.id === spaceId),
  });
}
