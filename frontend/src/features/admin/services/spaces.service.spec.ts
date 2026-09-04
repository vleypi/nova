const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet, delete: mockDelete },
}));

import { adminSpacesService } from "./spaces.service";

describe("AdminSpacesService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDelete.mockReset();
  });

  it("getSpaces без params → GET /admin/spaces с params=undefined", async () => {
    const list = { items: [], total: 0 };
    mockGet.mockResolvedValueOnce({ data: list });

    const result = await adminSpacesService.getSpaces();

    expect(mockGet).toHaveBeenCalledWith("/admin/spaces", { params: undefined });
    expect(result).toEqual(list);
  });

  it("getSpaces с params → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await adminSpacesService.getSpaces({ search: "nova" });

    expect(mockGet).toHaveBeenCalledWith("/admin/spaces", {
      params: { search: "nova" },
    });
  });

  it("getSpaceMembers → GET /admin/spaces/:id/members", async () => {
    const members = [{ id: "m-1", userId: "u-1" }];
    mockGet.mockResolvedValueOnce({ data: members });

    const result = await adminSpacesService.getSpaceMembers("s-1");

    expect(mockGet).toHaveBeenCalledWith("/admin/spaces/s-1/members");
    expect(result).toEqual(members);
  });

  it("deleteSpace → DELETE /admin/spaces/:id", async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true } });

    const result = await adminSpacesService.deleteSpace("s-1");

    expect(mockDelete).toHaveBeenCalledWith("/admin/spaces/s-1");
    expect(result).toEqual({ success: true });
  });
});
