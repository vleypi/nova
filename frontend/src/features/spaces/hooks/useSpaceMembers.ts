import { useQuery } from "@tanstack/react-query";
import { SPACE_MEMBERS_QUERY_KEY } from "@/shared/api/queryKeys";
import { spaceService } from "../services/space.service";

// Список членов пространства. enabled опционален (default true).
export function useSpaceMembers(spaceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [SPACE_MEMBERS_QUERY_KEY, spaceId],
    queryFn: () => spaceService.getMembers(spaceId),
    enabled: enabled && !!spaceId,
  });
}
