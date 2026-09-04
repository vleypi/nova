const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

import { spaceService } from "./space.service";
import type {
  ISpace,
  ISpaceMember,
  ISpaceActionResponse,
  ITransferOwnershipResponse,
  IRegenerateInviteResponse,
  TUpdateMemberPermissionsDto,
} from "../interfaces/space.interface";

const sampleSpace: ISpace = {
  id: "s-1",
  name: "Team Nova",
  ownerId: "u-1",
  inviteCode: "ABC123",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const sampleMember: ISpaceMember = {
  id: "m-1",
  userId: "u-2",
  spaceId: "s-1",
  role: "MEMBER",
  joinedAt: "2025-01-02T00:00:00Z",
  canCreateBoards: true,
  canEditBoards: true,
  canDraw: true,
  canDeleteBoards: false,
  user: null,
};

const okResponse: ISpaceActionResponse = { message: "ok", success: true };

describe("SpaceService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  describe("CRUD spaces", () => {
    it("getSpaces → GET /spaces", async () => {
      mockGet.mockResolvedValueOnce({ data: [sampleSpace] });
      const result = await spaceService.getSpaces();
      expect(mockGet).toHaveBeenCalledWith("/spaces");
      expect(result).toEqual([sampleSpace]);
    });

    it("createSpace → POST /spaces с DTO", async () => {
      mockPost.mockResolvedValueOnce({ data: sampleSpace });
      const result = await spaceService.createSpace({ name: "Team Nova" });
      expect(mockPost).toHaveBeenCalledWith("/spaces", { name: "Team Nova" });
      expect(result).toEqual(sampleSpace);
    });

    it("updateSpace → PATCH /spaces/:id с DTO", async () => {
      const updated = { ...sampleSpace, name: "Renamed" };
      mockPatch.mockResolvedValueOnce({ data: updated });
      const result = await spaceService.updateSpace("s-1", { name: "Renamed" });
      expect(mockPatch).toHaveBeenCalledWith("/spaces/s-1", { name: "Renamed" });
      expect(result).toEqual(updated);
    });

    it("deleteSpace → DELETE /spaces/:id", async () => {
      mockDelete.mockResolvedValueOnce({ data: okResponse });
      const result = await spaceService.deleteSpace("s-1");
      expect(mockDelete).toHaveBeenCalledWith("/spaces/s-1");
      expect(result).toEqual(okResponse);
    });
  });

  describe("members", () => {
    it("getMembers → GET /spaces/:id/members", async () => {
      mockGet.mockResolvedValueOnce({ data: [sampleMember] });
      const result = await spaceService.getMembers("s-1");
      expect(mockGet).toHaveBeenCalledWith("/spaces/s-1/members");
      expect(result).toEqual([sampleMember]);
    });

    it("removeMember → DELETE /spaces/:id/members/:userId", async () => {
      mockDelete.mockResolvedValueOnce({ data: okResponse });
      const result = await spaceService.removeMember("s-1", "u-2");
      expect(mockDelete).toHaveBeenCalledWith("/spaces/s-1/members/u-2");
      expect(result).toEqual(okResponse);
    });

    it("updateMemberPermissions → PATCH /spaces/:id/members/:userId/permissions с DTO", async () => {
      mockPatch.mockResolvedValueOnce({ data: sampleMember });
      const perms: TUpdateMemberPermissionsDto = {
        canCreateBoards: false,
        canEditBoards: true,
        canDraw: true,
        canDeleteBoards: false,
      };
      const result = await spaceService.updateMemberPermissions(
        "s-1",
        "u-2",
        perms,
      );
      expect(mockPatch).toHaveBeenCalledWith(
        "/spaces/s-1/members/u-2/permissions",
        perms,
      );
      expect(result).toEqual(sampleMember);
    });
  });

  describe("invite-flow", () => {
    it("joinByInviteCode → POST /spaces/join/:code", async () => {
      mockPost.mockResolvedValueOnce({ data: sampleSpace });
      const result = await spaceService.joinByInviteCode("ABC123");
      expect(mockPost).toHaveBeenCalledWith("/spaces/join/ABC123");
      expect(result).toEqual(sampleSpace);
    });

    it("regenerateInviteCode → POST /spaces/:id/regenerate-invite", async () => {
      const newCode: IRegenerateInviteResponse = { inviteCode: "NEW456" };
      mockPost.mockResolvedValueOnce({ data: newCode });
      const result = await spaceService.regenerateInviteCode("s-1");
      expect(mockPost).toHaveBeenCalledWith("/spaces/s-1/regenerate-invite");
      expect(result).toEqual(newCode);
    });
  });

  describe("leave + transfer", () => {
    it("leaveSpace → POST /spaces/:id/leave", async () => {
      mockPost.mockResolvedValueOnce({ data: okResponse });
      const result = await spaceService.leaveSpace("s-1");
      expect(mockPost).toHaveBeenCalledWith("/spaces/s-1/leave");
      expect(result).toEqual(okResponse);
    });

    it("transferOwnership → POST /spaces/:id/transfer-ownership с DTO", async () => {
      const transferResp: ITransferOwnershipResponse = {
        spaceId: "s-1",
        newOwnerId: "u-2",
        previousOwnerId: "u-1",
      };
      mockPost.mockResolvedValueOnce({ data: transferResp });
      const result = await spaceService.transferOwnership("s-1", {
        targetUserId: "u-2",
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/spaces/s-1/transfer-ownership",
        { targetUserId: "u-2" },
      );
      expect(result).toEqual(transferResp);
    });
  });

  describe("error propagation", () => {
    it("ошибка axios → промис реджектится без проглатывания", async () => {
      const err = new Error("403 Forbidden");
      mockPost.mockRejectedValueOnce(err);
      await expect(spaceService.createSpace({ name: "X" })).rejects.toBe(err);
    });
  });
});
