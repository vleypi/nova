import { AxiosError } from "axios";

// Унифицированная ошибка API: message, HTTP-status и serverdata.
export class ApiError extends Error {
  statusCode: number;
  data: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    data: Record<string, unknown> = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

// Преобразование любой error-причины в ApiError для единого error-flow.
export function handleServiceError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const message =
      error.response?.data?.message || error.message || "Произошла ошибка";
    const statusCode = error.response?.status ?? 0;
    const data: Record<string, unknown> = error.response?.data ?? {};
    return new ApiError(message, statusCode, data);
  }
  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError(error.message, 0);
  return new ApiError("Неизвестная ошибка", 0);
}
