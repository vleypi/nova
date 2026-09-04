import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ME_QUERY_KEY,
  BOARDS_QUERY_KEY,
  FAVORITE_BOARDS_QUERY_KEY,
} from "@/shared/api/queryKeys";
import type { IBoard } from "@/features/boards";
import { IUpdateProfileDto } from "../interfaces/profile.interface";
import { profileService } from "../services/profile.service";

// Update-мутация профиля. Патчит ME и boards/favorites cache.
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpdateProfileDto) => profileService.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData([ME_QUERY_KEY], updatedUser);

      const patchBoards = (old: IBoard[] | undefined) =>
        old?.map((board) =>
          board.createdByUser?.id === updatedUser.id
            ? {
                ...board,
                createdByUser: {
                  ...board.createdByUser,
                  name: updatedUser.name,
                },
              }
            : board,
        );

      queryClient.setQueriesData({ queryKey: [BOARDS_QUERY_KEY] }, patchBoards);
      queryClient.setQueriesData(
        { queryKey: [FAVORITE_BOARDS_QUERY_KEY] },
        patchBoards,
      );

      toast.success("Профиль обновлён");
    },
    onError: () => {
      toast.error("Не удалось обновить профиль");
    },
  });
}
