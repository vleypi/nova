const mockGet = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet },
}));

import { adminAuditService } from "./audit.service";

describe("AdminAuditService", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("getAuditLogs без params → GET /admin/audit с params=undefined", async () => {
    const logs = { items: [], total: 0 };
    mockGet.mockResolvedValueOnce({ data: logs });

    const result = await adminAuditService.getAuditLogs();

    expect(mockGet).toHaveBeenCalledWith("/admin/audit", { params: undefined });
    expect(result).toEqual(logs);
  });

  it("getAuditLogs с params → params прокидываются", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await adminAuditService.getAuditLogs({ page: 2, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith("/admin/audit", {
      params: { page: 2, limit: 20 },
    });
  });
});
