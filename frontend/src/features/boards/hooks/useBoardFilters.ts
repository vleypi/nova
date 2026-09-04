import { useMemo } from "react";
import { useMe } from "@/shared/identity";
import { IBoard } from "../interfaces/board.interface";
import { useFilters } from "../providers/FiltersProvider";

// Применяет filter/sort к списку досок согласно глобальным настройкам.
export function useBoardFilters(boards: IBoard[] | undefined) {
  const { filter, sortBy, viewMode, setFilter, setSortBy, setViewMode } =
    useFilters();
  const { data: me } = useMe();

  const processedBoards = useMemo(() => {
    const currentUserId = me?.id;
    let result = [...(boards ?? [])];
    if (filter === "owned" && currentUserId) {
      result = result.filter((board) => board.createdByUser?.id === currentUserId);
    } else if (filter === "not_owned" && currentUserId) {
      result = result.filter((board) => board.createdByUser?.id !== currentUserId);
    }
    result.sort((boardA, boardB) => {
      if (sortBy === "last_created") {
        return (
          new Date(boardB.createdAt).getTime() -
          new Date(boardA.createdAt).getTime()
        );
      }
      return (
        new Date(boardB.updatedAt).getTime() -
        new Date(boardA.updatedAt).getTime()
      );
    });
    return result;
  }, [boards, filter, sortBy, me?.id]);

  return {
    processedBoards,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
  };
}
