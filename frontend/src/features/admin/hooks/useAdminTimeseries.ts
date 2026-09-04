import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminOverviewService } from "../services/overview.service";

// Query time-series данных активности по админке.
export function useAdminTimeseries(params?: {
  months?: number;
  days?: number;
}) {
  return useQuery({
    queryKey: [...ADMIN_QK.TIMESERIES, params],
    queryFn: () => adminOverviewService.getTimeseries(params),
  });
}
