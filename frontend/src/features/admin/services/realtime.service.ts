import { axiosInstance } from "@/shared/config/axios.config";
import { IOnlineBoard } from "../interfaces/admin.interface";

// HTTP-сервис realtime-операций: онлайн-пользователи, broadcast, disconnect.
class AdminRealtimeService {
  async getOnlineBoards(): Promise<IOnlineBoard[]> {
    const response = await axiosInstance.get("/admin/realtime/boards");
    return response.data?.boards ?? [];
  }

  async disconnectUser(userId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.post(
      `/admin/realtime/disconnect/${userId}`,
    );
    return response.data;
  }

  async broadcast(
    message: string,
    type: string = "info",
  ): Promise<{ success: boolean }> {
    const response = await axiosInstance.post("/admin/realtime/broadcast", {
      message,
      type,
    });
    return response.data;
  }
}

export const adminRealtimeService = new AdminRealtimeService();
