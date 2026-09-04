const mockGet = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet },
}));

import { adminOverviewService } from "./overview.service";

describe("AdminOverviewService", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("getOverview → GET /admin/analytics/overview", async () => {
    const overview = { totalUsers: 10, totalBoards: 5, totalSpaces: 2 };
    mockGet.mockResolvedValueOnce({ data: overview });

    const result = await adminOverviewService.getOverview();

    expect(mockGet).toHaveBeenCalledWith("/admin/analytics/overview");
    expect(result).toEqual(overview);
  });

  it("getTimeseries без params → GET /admin/analytics/timeseries с params=undefined", async () => {
    const timeseries = { labels: [], datasets: [] };
    mockGet.mockResolvedValueOnce({ data: timeseries });

    const result = await adminOverviewService.getTimeseries();

    expect(mockGet).toHaveBeenCalledWith("/admin/analytics/timeseries", {
      params: undefined,
    });
    expect(result).toEqual(timeseries);
  });

  it("getTimeseries с params → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: { labels: [], datasets: [] } });

    await adminOverviewService.getTimeseries({ months: 3 });

    expect(mockGet).toHaveBeenCalledWith("/admin/analytics/timeseries", {
      params: { months: 3 },
    });
  });
});
