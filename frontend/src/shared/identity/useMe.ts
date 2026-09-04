import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/shared/config/axios.config";
import { ME_QUERY_KEY } from "@/shared/api/queryKeys";
import type { IUser } from "./user.types";

// HTTP-загрузка current-user (me-эндпоинт).
async function fetchMe(): Promise<IUser> {
  const response = await axiosInstance.get<IUser>("/users/me");
  return response.data;
}

// Query текущего пользователя.
export function useMe() {
  return useQuery({
    queryKey: [ME_QUERY_KEY],
    queryFn: fetchMe,
  });
}
