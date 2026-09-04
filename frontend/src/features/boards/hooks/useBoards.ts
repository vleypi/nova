import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BOARDS_QUERY_KEY,
  FAVORITE_BOARDS_QUERY_KEY,
} from "@/shared/api/queryKeys";
import { boardService } from "../services/board.service";
import {
  ICreateBoardDto,
  IGetBoardsParams,
} from "../interfaces/board.interface";
function useInvalidateBoards() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [FAVORITE_BOARDS_QUERY_KEY] });
  };
}
export function useBoards(params?: IGetBoardsParams) {
  return useQuery({
    queryKey: [BOARDS_QUERY_KEY, params],
    queryFn: () => boardService.getBoards(params),
  });
}
export function useBoardById(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["board", id],
    queryFn: () => boardService.getBoardById(id),
    enabled: enabled && !!id,
  });
}
export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ICreateBoardDto) => boardService.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [BOARDS_QUERY_KEY],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [FAVORITE_BOARDS_QUERY_KEY],
        refetchType: "none",
      });
      toast.success("Доска успешно создана");
    },
    onError: () => {
      toast.error("Не удалось создать доску");
    },
  });
}
export function useToggleFavorite() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: (boardId: string) => boardService.toggleFavorite(boardId),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Избранное обновлено");
    },
    onError: () => {
      toast.error("Не удалось изменить избранное");
    },
  });
}
export function useRenameBoard() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      boardService.updateBoard(id, { name }),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Доска переименована");
    },
    onError: () => {
      toast.error("Не удалось переименовать доску");
    },
  });
}
export function useDuplicateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardService.duplicateBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY] });
      toast.success("Доска продублирована");
    },
    onError: () => {
      toast.error("Не удалось продублировать доску");
    },
  });
}
export function useToggleBoardPrivacy() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: ({ id, isPrivate }: { id: string; isPrivate: boolean }) =>
      boardService.updateBoard(id, { isPrivate }),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Настройки приватности обновлены");
    },
    onError: () => {
      toast.error("Не удалось изменить приватность доски");
    },
  });
}
export function useDeleteBoard() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: (boardId: string) => boardService.deleteBoard(boardId),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Доска удалена");
    },
    onError: () => {
      toast.error("Не удалось удалить доску");
    },
  });
}
export function useExportBoard() {
  return useMutation({
    mutationFn: (boardId: string) => boardService.exportBoard(boardId),
    onSuccess: (data) => {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name || "board"}-backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Резервная копия скачана");
    },
    onError: () => {
      toast.error("Не удалось скачать резервную копию");
    },
  });
}
export function useMoveBoard() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: ({
      id,
      targetSpaceId,
    }: {
      id: string;
      targetSpaceId: string;
    }) => boardService.moveBoard(id, { targetSpaceId }),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Доска перемещена");
    },
    onError: () => {
      toast.error("Не удалось переместить доску");
    },
  });
}
export function useUpdateThumbnail() {
  const invalidateBoards = useInvalidateBoards();
  return useMutation({
    mutationFn: ({ id, thumbnail }: { id: string; thumbnail: string }) =>
      boardService.updateBoard(id, { thumbnail }),
    onSuccess: () => {
      invalidateBoards();
      toast.success("Обложка обновлена");
    },
    onError: () => {
      toast.error("Не удалось обновить обложку");
    },
  });
}
