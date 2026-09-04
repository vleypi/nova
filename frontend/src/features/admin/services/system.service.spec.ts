const mockGet = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { get: mockGet },
}));

import { adminSystemService } from "./system.service";

describe("AdminSystemService", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("getSystemHealth → GET /admin/system/health", async () => {
    const health = { status: "ok", services: [] };
    mockGet.mockResolvedValueOnce({ data: health });

    const result = await adminSystemService.getSystemHealth();

    expect(mockGet).toHaveBeenCalledWith("/admin/system/health");
    expect(result).toEqual(health);
  });

  it("ошибка axios → промис реджектится", async () => {
    const err = new Error("503 Service Unavailable");
    mockGet.mockRejectedValueOnce(err);
    await expect(adminSystemService.getSystemHealth()).rejects.toBe(err);
  });
});
