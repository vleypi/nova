const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet, patch: mockPatch, delete: mockDelete },
}));

import { adminUsersService } from "./users.service";

const mockUser = {
  id: "u-1",
  email: "user@example.com",
  name: "Test User",
  role: "USER",
  isBlocked: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("AdminUsersService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it("getUsers без params → GET /admin/users с params=undefined", async () => {
    const list = { items: [], total: 0 };
    mockGet.mockResolvedValueOnce({ data: list });

    const result = await adminUsersService.getUsers();

    expect(mockGet).toHaveBeenCalledWith("/admin/users", { params: undefined });
    expect(result).toEqual(list);
  });

  it("getUsers с params → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await adminUsersService.getUsers({ search: "alice", role: "ADMIN" });

    expect(mockGet).toHaveBeenCalledWith("/admin/users", {
      params: { search: "alice", role: "ADMIN" },
    });
  });

  it("getUserActivity → GET /admin/users/:id/activity", async () => {
    const activity = { boardsCreated: 3, lastActiveAt: "2025-06-01T00:00:00Z" };
    mockGet.mockResolvedValueOnce({ data: activity });

    const result = await adminUsersService.getUserActivity("u-1");

    expect(mockGet).toHaveBeenCalledWith("/admin/users/u-1/activity");
    expect(result).toEqual(activity);
  });

  it("updateUserRole → PATCH /admin/users/:id/role с role", async () => {
    mockPatch.mockResolvedValueOnce({ data: { ...mockUser, role: "ADMIN" } });

    const result = await adminUsersService.updateUserRole("u-1", "ADMIN");

    expect(mockPatch).toHaveBeenCalledWith("/admin/users/u-1/role", {
      role: "ADMIN",
    });
    expect(result.role).toBe("ADMIN");
  });

  it("blockUser → PATCH /admin/users/:id/block с isBlocked", async () => {
    mockPatch.mockResolvedValueOnce({ data: { ...mockUser, isBlocked: true } });

    const result = await adminUsersService.blockUser("u-1", true);

    expect(mockPatch).toHaveBeenCalledWith("/admin/users/u-1/block", {
      isBlocked: true,
    });
    expect(result.isBlocked).toBe(true);
  });

  it("deleteUser → DELETE /admin/users/:id", async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true } });

    const result = await adminUsersService.deleteUser("u-1");

    expect(mockDelete).toHaveBeenCalledWith("/admin/users/u-1");
    expect(result).toEqual({ success: true });
  });
});
