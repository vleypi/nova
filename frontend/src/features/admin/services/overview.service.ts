import { axiosInstance } from "@/shared/config/axios.config";
import {
  IAdminOverview,
  IAdminTimeseries,
} from "../interfaces/admin.interface";

// HTTP-сервис админ-аналитики: overview-метрики и timeseries.
class AdminOverviewService {
  async getOverview(): Promise<IAdminOverview> {
    const response = await axiosInstance.get("/admin/analytics/overview");
    return response.data;
  }

  async getTimeseries(params?: {
    months?: number;
    days?: number;
  }): Promise<IAdminTimeseries> {
    const response = await axiosInstance.get("/admin/analytics/timeseries", {
      params,
    });
    return response.data;
  }
}

export const adminOverviewService = new AdminOverviewService();
