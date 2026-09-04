import { axiosInstance } from "@/shared/config/axios.config";
import { IUser } from "@/shared/identity";
import {
  IAdminUserActivity,
  IAdminUsersParams,
  IAdminUserList,
} from "../interfaces/admin.interface";

// HTTP-сервис управления пользователями в админке.
class AdminUsersService {
  async getUsers(params?: IAdminUsersParams): Promise<IAdminUserList> {
    const response = await axiosInstance.get("/admin/users", { params });
    return response.data;
  }

  async getUserActivity(id: string): Promise<IAdminUserActivity> {
    const response = await axiosInstance.get(`/admin/users/${id}/activity`);
    return response.data;
  }

  async updateUserRole(id: string, role: string): Promise<IUser> {
    const response = await axiosInstance.patch(`/admin/users/${id}/role`, {
      role,
    });
    return response.data;
  }

  async blockUser(id: string, isBlocked: boolean): Promise<IUser> {
    const response = await axiosInstance.patch(`/admin/users/${id}/block`, {
      isBlocked,
    });
    return response.data;
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/admin/users/${id}`);
    return response.data;
  }
}

export const adminUsersService = new AdminUsersService();
