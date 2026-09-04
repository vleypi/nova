"use client";
import {
  PageHeader,
  Filters,
  BoardList,
  EmptyFavorites,
  useFavoriteBoards,
  useBoardFilters,
} from "@/features/boards";

// Страница избранных досок
export default function FavoritesPage() {
  const { data: boards, isLoading, isError } = useFavoriteBoards();
  const {
    processedBoards,
    filter,
    sortBy,
    viewMode,
    setFilter,
    setSortBy,
    setViewMode,
  } = useBoardFilters(boards);

  return (
    <main className="main-content flex-1 flex flex-col min-w-0 bg-white">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <PageHeader title="Избранное" />
        <Filters
          filter={filter}
          sortBy={sortBy}
          viewMode={viewMode}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onViewModeChange={setViewMode}
        />
      </div>
      <BoardList
        boards={processedBoards}
        isLoading={isLoading}
        isError={isError}
        viewMode={viewMode}
        emptyContent={<EmptyFavorites />}
      />
    </main>
  );
}
