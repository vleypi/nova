import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminSpacesService } from "../services/spaces.service";

// Query участников space с возможностью отключения через enabled.
export function useAdminSpaceMembers(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_QK.SPACE_MEMBERS, spaceId],
    queryFn: () => adminSpacesService.getSpaceMembers(spaceId),
    enabled: enabled && !!spaceId,
  });
}
