"use client";
import { useRouter, useParams } from "next/navigation";
import {
  PageHeader,
  Filters,
  BoardList,
  useBoards,
  useCreateBoard,
  useBoardFilters,
  EmptyBoards,
} from "@/features/boards";
import { EditSpaceForm, useSpaceById } from "@/features/spaces";
import { useModal } from "@/shared/modal/hooks/useModal";
import { DEFAULT_PROTECTED_ROUTE } from "@/shared/config/proxy.constant";

// Страница пространства
export default function SpacePage() {
  const router = useRouter();
  const { spaceId } = useParams<{ spaceId: string }>();

  const { data: space } = useSpaceById(spaceId);
  const { data: boards, isLoading, isError } = useBoards({ spaceId });
  const { openModal, closeModal } = useModal();
  const { mutate: createBoard } = useCreateBoard();

  const {
    processedBoards,
    filter,
    sortBy,
    viewMode,
    setFilter,
    setSortBy,
    setViewMode,
  } = useBoardFilters(boards);

  const handleCreateBoard = () => {
    createBoard(
      { spaceId },
      {
        onSuccess: (board) => router.push(`/app/board/${board.id}`),
      },
    );
  };

  const handleEditSpace = () => {
    if (!space) return;

    openModal(
      "Редактировать пространство",
      <EditSpaceForm
        space={space}
        onRemoved={() => {
          closeModal();
          router.push(DEFAULT_PROTECTED_ROUTE);
        }}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <main className="main-content flex-1 flex flex-col min-w-0 bg-white">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <PageHeader
          title={space?.name ?? "..."}
          space={space}
          onEdit={handleEditSpace}
          onCreateBoard={handleCreateBoard}
        />
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
        emptyContent={<EmptyBoards spaceId={spaceId} />}
      />
    </main>
  );
}
