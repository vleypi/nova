"use client";
import { useRouter } from "next/navigation";
import { useSpaces } from "@/features/spaces";
import { useCreateBoard } from "../../hooks/useBoards";
import { BOARD_ICON_PATH } from "../../constants/dashboard.constant";
import { EmptyState } from "./EmptyState";

interface IEmptyBoardsProps {
  spaceId?: string;
}

const boardIcon = (
  <svg
    className="w-10 h-10"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d={BOARD_ICON_PATH}
    />
  </svg>
);

// Пустое состояние списка досок с кнопкой создания.
export function EmptyBoards({ spaceId }: IEmptyBoardsProps) {
  const router = useRouter();
  const { mutate: createBoard, isPending } = useCreateBoard();
  const { data: spaces } = useSpaces();

  const resolvedSpaceId = spaceId ?? spaces?.[0]?.id;

  const handleCreate = () => {
    if (!resolvedSpaceId) return;
    createBoard(
      { spaceId: resolvedSpaceId },
      { onSuccess: (board) => router.push(`/app/board/${board.id}`) },
    );
  };

  const actions = (
    <button
      onClick={handleCreate}
      disabled={isPending || !resolvedSpaceId}
      className="px-4 py-2 bg-nova-blue text-white text-sm font-medium hover:bg-nova-blue/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      {isPending ? "Создание..." : "Создать новую доску"}
    </button>
  );

  return (
    <EmptyState
      iconBgClass="bg-blue-50"
      iconColorClass="text-nova-blue"
      icon={boardIcon}
      title="Здесь пока нет досок"
      description="Создайте первую доску, чтобы начать совместную работу с командой"
      actions={actions}
    />
  );
}
