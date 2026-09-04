
const mockPatch = jest.fn();
const mockSaveUserData = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { patch: mockPatch },
}));

jest.mock("@/shared/utils/storage.util", () => ({
  saveUserData: mockSaveUserData,
}));

import { profileService } from "./profile.service";
import type { IUser } from "@/shared/identity";

const mockUser: IUser = {
  id: "u-1",
  email: "v@b.c",
  name: "Updated Name",
  role: "USER",
  isBlocked: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

describe("ProfileService.updateProfile", () => {
  beforeEach(() => {
    mockPatch.mockReset();
    mockSaveUserData.mockReset();
  });

  it("PATCH /users/me с DTO → возвращает user + сохраняет в storage", async () => {
    mockPatch.mockResolvedValueOnce({ data: mockUser });
    const dto = { name: "Updated Name" };

    const result = await profileService.updateProfile(dto);

    expect(mockPatch).toHaveBeenCalledWith("/users/me", dto);
    expect(result).toEqual(mockUser);
    expect(mockSaveUserData).toHaveBeenCalledWith(mockUser);
    expect(mockSaveUserData).toHaveBeenCalledTimes(1);
  });

  it("прокидывает avatar отдельно", async () => {
    mockPatch.mockResolvedValueOnce({ data: mockUser });
    await profileService.updateProfile({ avatar: "/avatars/v.png" });
    expect(mockPatch).toHaveBeenCalledWith("/users/me", {
      avatar: "/avatars/v.png",
    });
  });

  it("ошибка axios → saveUserData НЕ вызывается", async () => {
    mockPatch.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(
      profileService.updateProfile({ name: "X" }),
    ).rejects.toThrow("Forbidden");
    expect(mockSaveUserData).not.toHaveBeenCalled();
  });
});
