const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet, post: mockPost },
}));

import { adminRealtimeService } from "./realtime.service";

describe("AdminRealtimeService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("getOnlineBoards → GET /admin/realtime/boards, возвращает boards[]", async () => {
    const boards = [{ id: "b-1", onlineCount: 3 }];
    mockGet.mockResolvedValueOnce({ data: { boards } });

    const result = await adminRealtimeService.getOnlineBoards();

    expect(mockGet).toHaveBeenCalledWith("/admin/realtime/boards");
    expect(result).toEqual(boards);
  });

  it("getOnlineBoards когда data.boards отсутствует → возвращает []", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const result = await adminRealtimeService.getOnlineBoards();

    expect(result).toEqual([]);
  });

  it("disconnectUser → POST /admin/realtime/disconnect/:userId", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    const result = await adminRealtimeService.disconnectUser("u-1");

    expect(mockPost).toHaveBeenCalledWith("/admin/realtime/disconnect/u-1");
    expect(result).toEqual({ success: true });
  });

  it("broadcast с type → POST /admin/realtime/broadcast с message и type", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    await adminRealtimeService.broadcast("Сервер на обслуживании", "warning");

    expect(mockPost).toHaveBeenCalledWith("/admin/realtime/broadcast", {
      message: "Сервер на обслуживании",
      type: "warning",
    });
  });

  it("broadcast без type → type по умолчанию 'info'", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    await adminRealtimeService.broadcast("Привет");

    expect(mockPost).toHaveBeenCalledWith("/admin/realtime/broadcast", {
      message: "Привет",
      type: "info",
    });
  });
});
