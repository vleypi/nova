"use client";
import { IBoard } from "../../interfaces/board.interface";
import { TUseBoardActionsReturn } from "../../hooks/useBoardActions";
import { RenameBoardModal } from "./RenameBoardModal";
import { DeleteBoardModal } from "./DeleteBoardModal";
import { ChangeThumbnailModal } from "./ChangeThumbnailModal";
import { MoveBoardModal } from "./MoveBoardModal";

interface IBoardModalsManagerProps {
  board: IBoard;
  actions: Pick<
    TUseBoardActionsReturn,
    | "renameOpen"
    | "closeRename"
    | "deleteOpen"
    | "closeDelete"
    | "thumbnailOpen"
    | "closeThumbnail"
    | "moveOpen"
    | "closeMove"
  >;
}

// Контейнер четырёх модалок над одной доской: rename/delete/thumbnail/move.
export function BoardModalsManager({
  board,
  actions,
}: IBoardModalsManagerProps) {
  return (
    <>
      <RenameBoardModal
        boardId={board.id}
        currentName={board.name}
        isOpen={actions.renameOpen}
        onClose={actions.closeRename}
      />
      <DeleteBoardModal
        boardId={board.id}
        boardName={board.name}
        isOpen={actions.deleteOpen}
        onClose={actions.closeDelete}
      />
      <ChangeThumbnailModal
        boardId={board.id}
        currentThumbnail={board.thumbnail}
        isOpen={actions.thumbnailOpen}
        onClose={actions.closeThumbnail}
      />
      <MoveBoardModal
        boardId={board.id}
        currentSpaceId={board.spaceId}
        isOpen={actions.moveOpen}
        onClose={actions.closeMove}
      />
    </>
  );
}
