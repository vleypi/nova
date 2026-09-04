const mockPost = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { post: mockPost },
}));

import { presignAsset, confirmAsset } from "./assets.service";
import type { IPresignRequest } from "./assets.service";

const presignReq: IPresignRequest = {
  boardId: "b-1",
  mime: "image/png",
  sizeBytes: 1024,
  sha256: "abc123",
  width: 800,
  height: 600,
};

describe("assets.service", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("presignAsset → POST /assets/presign с телом запроса", async () => {
    const presignResponse = {
      assetId: "a-1",
      uploadUrl: "https://s3.example.com/upload",
      storageKey: "key/a-1",
      duplicate: false,
    };
    mockPost.mockResolvedValueOnce({ data: presignResponse });

    const result = await presignAsset(presignReq);

    expect(mockPost).toHaveBeenCalledWith("/assets/presign", presignReq);
    expect(result).toEqual(presignResponse);
  });

  it("presignAsset duplicate=true → флаг дубликата возвращается", async () => {
    const dupResponse = {
      assetId: "a-existing",
      uploadUrl: "",
      storageKey: "key/a-existing",
      duplicate: true,
    };
    mockPost.mockResolvedValueOnce({ data: dupResponse });

    const result = await presignAsset(presignReq);

    expect(result.duplicate).toBe(true);
  });

  it("confirmAsset → POST /assets/confirm с assetId в теле", async () => {
    const confirmResponse = { proxyUrl: "/proxy/assets/a-1" };
    mockPost.mockResolvedValueOnce({ data: confirmResponse });

    const result = await confirmAsset("a-1");

    expect(mockPost).toHaveBeenCalledWith("/assets/confirm", { assetId: "a-1" });
    expect(result).toEqual(confirmResponse);
  });

  it("ошибка axios → промис реджектится", async () => {
    const err = new Error("413 Payload Too Large");
    mockPost.mockRejectedValueOnce(err);
    await expect(presignAsset(presignReq)).rejects.toBe(err);
  });
});
