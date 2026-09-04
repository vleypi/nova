import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminRealtimeService } from "../services/realtime.service";
import { ADMIN_REALTIME_REFETCH_INTERVAL_MS } from "../constants/admin.constant";

// Polling-query онлайн-досок.
export function useAdminRealtime() {
  return useQuery({
    queryKey: ADMIN_QK.REALTIME,
    queryFn: () => adminRealtimeService.getOnlineBoards(),
    refetchInterval: ADMIN_REALTIME_REFETCH_INTERVAL_MS,
  });
}
