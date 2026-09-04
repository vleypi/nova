import { useQuery } from "@tanstack/react-query";
import { ADMIN_QK } from "@/shared/api/queryKeys";
import { adminAuditService } from "../services/audit.service";
import { IAuditParams } from "../interfaces/admin.interface";

// Query аудит-логов с пагинацией и фильтрами.
export function useAdminAuditLogs(params?: IAuditParams) {
  return useQuery({
    queryKey: [...ADMIN_QK.AUDIT, params],
    queryFn: () => adminAuditService.getAuditLogs(params),
  });
}
