import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminSystemService } from "../services/system.service";
import { ADMIN_HEALTH_REFETCH_INTERVAL_MS } from "../constants/admin.constant";

// Polling-query здоровья системы.
export function useAdminHealth() {
  return useQuery({
    queryKey: ADMIN_QK.HEALTH,
    queryFn: () => adminSystemService.getSystemHealth(),
    refetchInterval: ADMIN_HEALTH_REFETCH_INTERVAL_MS,
  });
}
