import { axiosInstance } from "@/shared/config/axios.config";
import {
  IAuditLogList,
  IAuditParams,
} from "../interfaces/admin.interface";

// HTTP-сервис аудит-логов админки.
class AdminAuditService {
  async getAuditLogs(params?: IAuditParams): Promise<IAuditLogList> {
    const response = await axiosInstance.get("/admin/audit", { params });
    return response.data;
  }
}

export const adminAuditService = new AdminAuditService();
