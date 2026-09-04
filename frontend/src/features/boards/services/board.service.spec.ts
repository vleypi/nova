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

import { boardService } from "./board.service";

describe("BoardService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it("getBoards без params → GET /boards с params=undefined", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await boardService.getBoards();
    expect(mockGet).toHaveBeenCalledWith("/boards", { params: undefined });
  });

  it("getBoards с spaceId → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await boardService.getBoards({ spaceId: "s-1" });
    expect(mockGet).toHaveBeenCalledWith("/boards", {
      params: { spaceId: "s-1" },
    });
  });

  it("getFavoriteBoards → GET /boards/favorites", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await boardService.getFavoriteBoards();
    expect(mockGet).toHaveBeenCalledWith("/boards/favorites");
  });

  it("getBoardById → GET /boards/:id", async () => {
    mockGet.mockResolvedValueOnce({ data: { id: "b-1" } });
    const result = await boardService.getBoardById("b-1");
    expect(mockGet).toHaveBeenCalledWith("/boards/b-1");
    expect(result).toEqual({ id: "b-1" });
  });

  it("createBoard → POST /boards с DTO", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "b-new" } });
    await boardService.createBoard({ name: "New", spaceId: "s-1" });
    expect(mockPost).toHaveBeenCalledWith("/boards", {
      name: "New",
      spaceId: "s-1",
    });
  });

  it("updateBoard → PATCH /boards/:id с DTO", async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: "b-1" } });
    await boardService.updateBoard("b-1", { name: "Renamed" });
    expect(mockPatch).toHaveBeenCalledWith("/boards/b-1", { name: "Renamed" });
  });

  it("deleteBoard → DELETE /boards/:id", async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true } });
    await boardService.deleteBoard("b-1");
    expect(mockDelete).toHaveBeenCalledWith("/boards/b-1");
  });

  it("duplicateBoard → POST /boards/:id/duplicate", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "b-copy" } });
    await boardService.duplicateBoard("b-1");
    expect(mockPost).toHaveBeenCalledWith("/boards/b-1/duplicate");
  });

  it("toggleFavorite → POST /boards/:id/favorite", async () => {
    mockPost.mockResolvedValueOnce({ data: { isFavorite: true } });
    await boardService.toggleFavorite("b-1");
    expect(mockPost).toHaveBeenCalledWith("/boards/b-1/favorite");
  });

  it("exportBoard → GET /boards/:id/export", async () => {
    mockGet.mockResolvedValueOnce({ data: { elements: [] } });
    await boardService.exportBoard("b-1");
    expect(mockGet).toHaveBeenCalledWith("/boards/b-1/export");
  });

  it("moveBoard → PATCH /boards/:id/move с targetSpaceId", async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: "b-1" } });
    await boardService.moveBoard("b-1", { targetSpaceId: "s-2" });
    expect(mockPatch).toHaveBeenCalledWith("/boards/b-1/move", {
      targetSpaceId: "s-2",
    });
  });
});
