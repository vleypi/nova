import { axiosInstance } from "@/shared/config/axios.config";
import {
  IAdminBoardList,
  IAdminBoardsParams,
} from "../interfaces/admin.interface";

// HTTP-сервис управления досками в админке.
class AdminBoardsService {
  async getBoards(params?: IAdminBoardsParams): Promise<IAdminBoardList> {
    const response = await axiosInstance.get("/admin/boards", { params });
    return response.data;
  }

  async deleteBoard(id: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/admin/boards/${id}`);
    return response.data;
  }
}

export const adminBoardsService = new AdminBoardsService();
