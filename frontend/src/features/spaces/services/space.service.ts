import { axiosInstance } from "@/shared/config/axios.config";
import type {
  ISpace,
  ISpaceMember,
  ISpaceActionResponse,
  IRegenerateInviteResponse,
  ICreateSpaceDto,
  IUpdateSpaceDto,
  TUpdateMemberPermissionsDto,
  ITransferOwnershipDto,
  ITransferOwnershipResponse,
} from "../interfaces/space.interface";

// HTTP-сервис spaces. Space CRUD, members, invite-flow, transfer-ownership.
class SpaceService {
  async getSpaces(): Promise<ISpace[]> {
    const response = await axiosInstance.get("/spaces");
    return response.data;
  }

  async createSpace(data: ICreateSpaceDto): Promise<ISpace> {
    const response = await axiosInstance.post("/spaces", data);
    return response.data;
  }

  async updateSpace(id: string, data: IUpdateSpaceDto): Promise<ISpace> {
    const response = await axiosInstance.patch(`/spaces/${id}`, data);
    return response.data;
  }

  async deleteSpace(id: string): Promise<ISpaceActionResponse> {
    const response = await axiosInstance.delete(`/spaces/${id}`);
    return response.data;
  }

  async getMembers(spaceId: string): Promise<ISpaceMember[]> {
    const response = await axiosInstance.get(`/spaces/${spaceId}/members`);
    return response.data;
  }

  async joinByInviteCode(code: string): Promise<ISpace> {
    const response = await axiosInstance.post(`/spaces/join/${code}`);
    return response.data;
  }

  async leaveSpace(spaceId: string): Promise<ISpaceActionResponse> {
    const response = await axiosInstance.post(`/spaces/${spaceId}/leave`);
    return response.data;
  }

  async removeMember(
    spaceId: string,
    targetUserId: string,
  ): Promise<ISpaceActionResponse> {
    const response = await axiosInstance.delete(
      `/spaces/${spaceId}/members/${targetUserId}`,
    );
    return response.data;
  }

  async updateMemberPermissions(
    spaceId: string,
    targetUserId: string,
    data: TUpdateMemberPermissionsDto,
  ): Promise<ISpaceMember> {
    const response = await axiosInstance.patch(
      `/spaces/${spaceId}/members/${targetUserId}/permissions`,
      data,
    );
    return response.data;
  }

  async transferOwnership(
    spaceId: string,
    data: ITransferOwnershipDto,
  ): Promise<ITransferOwnershipResponse> {
    const response = await axiosInstance.post(
      `/spaces/${spaceId}/transfer-ownership`,
      data,
    );
    return response.data;
  }

  async regenerateInviteCode(
    spaceId: string,
  ): Promise<IRegenerateInviteResponse> {
    const response = await axiosInstance.post(
      `/spaces/${spaceId}/regenerate-invite`,
    );
    return response.data;
  }
}

export const spaceService = new SpaceService();
