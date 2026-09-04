import { axiosInstance } from "@/shared/config/axios.config";
import type { ISpaceMember } from "@/features/spaces";
import {
  IAdminSpaceList,
  IAdminSpacesParams,
} from "../interfaces/admin.interface";

// HTTP-сервис управления пространствами в админке.
class AdminSpacesService {
  async getSpaces(params?: IAdminSpacesParams): Promise<IAdminSpaceList> {
    const response = await axiosInstance.get("/admin/spaces", { params });
    return response.data;
  }

  async getSpaceMembers(spaceId: string): Promise<ISpaceMember[]> {
    const response = await axiosInstance.get(
      `/admin/spaces/${spaceId}/members`,
    );
    return response.data;
  }

  async deleteSpace(id: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/admin/spaces/${id}`);
    return response.data;
  }
}

export const adminSpacesService = new AdminSpacesService();
