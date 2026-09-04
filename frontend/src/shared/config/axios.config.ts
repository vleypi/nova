import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { handleServiceError } from "@/shared/utils/service.util";
import { clearUserData } from "@/shared/utils/storage.util";
import { AUTH_ROUTE } from "@/shared/config/proxy.constant";

const API_URL = "/api";
const REQUEST_TIMEOUT_MS = 10_000;

// Единый axios-инстанс с baseURL, JSON-headers и refresh-token интерсептором на 401.
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.data && "data" in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          clearUserData();
          window.location.href = AUTH_ROUTE;
        }
        return Promise.reject(handleServiceError(refreshError));
      }
    }
    return Promise.reject(handleServiceError(error));
  },
);
