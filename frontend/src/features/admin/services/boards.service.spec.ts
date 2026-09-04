const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet, delete: mockDelete },
}));

import { adminBoardsService } from "./boards.service";

describe("AdminBoardsService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDelete.mockReset();
  });

  it("getBoards без params → GET /admin/boards с params=undefined", async () => {
    const list = { items: [], total: 0 };
    mockGet.mockResolvedValueOnce({ data: list });

    const result = await adminBoardsService.getBoards();

    expect(mockGet).toHaveBeenCalledWith("/admin/boards", { params: undefined });
    expect(result).toEqual(list);
  });

  it("getBoards с params → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await adminBoardsService.getBoards({ spaceId: "s-1" });

    expect(mockGet).toHaveBeenCalledWith("/admin/boards", {
      params: { spaceId: "s-1" },
    });
  });

  it("deleteBoard → DELETE /admin/boards/:id", async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true } });

    const result = await adminBoardsService.deleteBoard("b-1");

    expect(mockDelete).toHaveBeenCalledWith("/admin/boards/b-1");
    expect(result).toEqual({ success: true });
  });
});
