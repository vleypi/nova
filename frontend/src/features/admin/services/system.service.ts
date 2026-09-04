import { axiosInstance } from "@/shared/config/axios.config";
import { ISystemHealth } from "../interfaces/admin.interface";

// HTTP-сервис проверки здоровья системы.
class AdminSystemService {
  async getSystemHealth(): Promise<ISystemHealth> {
    const response = await axiosInstance.get("/admin/system/health");
    return response.data;
  }
}

export const adminSystemService = new AdminSystemService();
