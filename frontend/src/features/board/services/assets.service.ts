import { axiosInstance } from "@/shared/config/axios.config";

// Запрос на получение presigned URL для загрузки картинки.
// sha256 нужен серверу для дедупликации (если такая картинка уже есть, duplicate=true).
export interface IPresignRequest {
  boardId: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
}

// Ответ presign: assetId, URL для PUT, ключ хранилища, флаг дубликата.
// Если duplicate=true, клиент пропускает PUT и сразу делает confirm.
export interface IPresignResponse {
  assetId: string;
  uploadUrl: string;
  storageKey: string;
  duplicate: boolean;
}

// Ответ confirm: финальный proxyUrl для использования в src элемента.
export interface IConfirmResponse {
  proxyUrl: string;
}

// Запрашивает presigned URL для загрузки картинки. Первый шаг 3-фазного аплоада.
export async function presignAsset(
  req: IPresignRequest,
): Promise<IPresignResponse> {
  const res = await axiosInstance.post<IPresignResponse>(
    "/assets/presign",
    req,
  );
  return res.data;
}

// Подтверждает успешный аплоад. Третий шаг 3-фазного аплоада, возвращает proxyUrl.
export async function confirmAsset(
  assetId: string,
): Promise<IConfirmResponse> {
  const res = await axiosInstance.post<IConfirmResponse>("/assets/confirm", {
    assetId,
  });
  return res.data;
}
