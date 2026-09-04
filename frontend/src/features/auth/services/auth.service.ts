import { axiosInstance } from "@/shared/config/axios.config";
import { IUser } from "@/shared/identity";
import { saveUserData, clearUserData } from "@/shared/utils/storage.util";

import { IAuthResponse, ILoginResponse } from "../interfaces/auth.interface";

// HTTP-сервис auth-flow. Отправка OTP, верификация, refresh-сессии,
// unlink OAuth-провайдера, logout.
class AuthService {
  async sendAuthCode(email: string): Promise<IAuthResponse> {
    const response = await axiosInstance.post("/auth/send-code", { email });
    return response.data;
  }

  // Верификация OTP. При успехе сохраняет user в local storage.
  async verifyAuthCode(email: string, code: string): Promise<ILoginResponse> {
    const response = await axiosInstance.post("/auth/verify-code", {
      email,
      code,
    });

    const loginData: ILoginResponse = response.data;
    saveUserData(loginData.user);

    return loginData;
  }

  async refresh(): Promise<IAuthResponse> {
    const response = await axiosInstance.post("/auth/refresh");
    return response.data;
  }

  async unlinkProvider(provider: string): Promise<IUser> {
    const response = await axiosInstance.delete(`/auth/providers/${provider}`);
    return response.data;
  }

  // Logout. Чистит local storage даже если сервер вернул ошибку.
  async logout(): Promise<IAuthResponse> {
    try {
      const response = await axiosInstance.post("/auth/logout");
      clearUserData();
      return response.data;
    } catch (error) {
      clearUserData();
      throw error;
    }
  }
}

export const authService = new AuthService();
