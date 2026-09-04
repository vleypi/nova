import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminOverviewService } from "../services/overview.service";

// Query overview-метрик админки.
export function useAdminOverview() {
  return useQuery({
    queryKey: ADMIN_QK.OVERVIEW,
    queryFn: () => adminOverviewService.getOverview(),
  });
}
