const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockSaveUserData = jest.fn();
const mockClearUserData = jest.fn();

jest.mock("@/shared/config/axios.config", () => ({
  axiosInstance: { post: mockPost, delete: mockDelete },
}));

jest.mock("@/shared/utils/storage.util", () => ({
  saveUserData: mockSaveUserData,
  clearUserData: mockClearUserData,
}));

import { authService } from "./auth.service";
import type { IUser } from "@/shared/identity";
import type {
  IAuthResponse,
  ILoginResponse,
} from "../interfaces/auth.interface";

const mockUser: IUser = {
  id: "u-1",
  email: "vova@example.com",
  name: "Vova",
  role: "USER",
  isBlocked: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("AuthService", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDelete.mockReset();
    mockSaveUserData.mockReset();
    mockClearUserData.mockReset();
  });

  describe("sendAuthCode", () => {
    it("POST /auth/send-code с email → возвращает response.data", async () => {
      const data: IAuthResponse = { message: "Код отправлен", success: true };
      mockPost.mockResolvedValueOnce({ data });

      const result = await authService.sendAuthCode("vova@example.com");

      expect(mockPost).toHaveBeenCalledWith("/auth/send-code", {
        email: "vova@example.com",
      });
      expect(result).toEqual(data);
    });

    it("прокидывает ошибку axios наверх", async () => {
      const err = new Error("Network down");
      mockPost.mockRejectedValueOnce(err);
      await expect(authService.sendAuthCode("a@b.c")).rejects.toBe(err);
    });
  });

  describe("verifyAuthCode", () => {
    it("POST /auth/verify-code с email+code → возвращает data и сохраняет user", async () => {
      const data: ILoginResponse = {
        accessToken: "at",
        refreshToken: "rt",
        user: mockUser,
      };
      mockPost.mockResolvedValueOnce({ data });

      const result = await authService.verifyAuthCode("vova@example.com", "1234567");

      expect(mockPost).toHaveBeenCalledWith("/auth/verify-code", {
        email: "vova@example.com",
        code: "1234567",
      });
      expect(mockSaveUserData).toHaveBeenCalledWith(mockUser);
      expect(mockSaveUserData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(data);
    });

    it("при ошибке saveUserData НЕ вызывается", async () => {
      mockPost.mockRejectedValueOnce(new Error("Invalid code"));
      await expect(
        authService.verifyAuthCode("a@b.c", "0000000"),
      ).rejects.toThrow("Invalid code");
      expect(mockSaveUserData).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("POST /auth/refresh без body → возвращает data", async () => {
      const data: IAuthResponse = { message: "ok", success: true };
      mockPost.mockResolvedValueOnce({ data });

      const result = await authService.refresh();

      expect(mockPost).toHaveBeenCalledWith("/auth/refresh");
      expect(result).toEqual(data);
    });
  });

  describe("unlinkProvider", () => {
    it("DELETE /auth/providers/:provider → возвращает обновлённого user", async () => {
      mockDelete.mockResolvedValueOnce({ data: mockUser });

      const result = await authService.unlinkProvider("google");

      expect(mockDelete).toHaveBeenCalledWith("/auth/providers/google");
      expect(result).toEqual(mockUser);
    });

    it("работает для разных провайдеров", async () => {
      mockDelete.mockResolvedValue({ data: mockUser });
      await authService.unlinkProvider("github");
      expect(mockDelete).toHaveBeenCalledWith("/auth/providers/github");
    });
  });

  describe("logout", () => {
    it("успех: POST /auth/logout → clearUserData + возвращает data", async () => {
      const data: IAuthResponse = { message: "bye", success: true };
      mockPost.mockResolvedValueOnce({ data });

      const result = await authService.logout();

      expect(mockPost).toHaveBeenCalledWith("/auth/logout");
      expect(mockClearUserData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(data);
    });

    it("ошибка сервера: всё равно clearUserData + ребрасывает ошибку", async () => {
      const err = new Error("500 logout failed");
      mockPost.mockRejectedValueOnce(err);

      await expect(authService.logout()).rejects.toBe(err);
      // Критично: storage чистится даже если сервер вернул ошибку,
      // иначе юзер останется "залогинен" локально после неудачного logout.
      expect(mockClearUserData).toHaveBeenCalledTimes(1);
    });
  });
});
