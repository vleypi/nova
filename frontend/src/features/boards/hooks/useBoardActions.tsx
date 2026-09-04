"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/shared/modal/hooks/useModal";
import {
  useToggleFavorite,
  useDuplicateBoard,
  useToggleBoardPrivacy,
  useExportBoard,
} from "@/features/boards/hooks/useBoards";
import { IBoard } from "@/features/boards/interfaces/board.interface";
import { EditBoardForm } from "@/features/boards/components/Boards/EditBoardForm";

export function useBoardActions(board: IBoard, index: number) {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [thumbnailOpen, setThumbnailOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { mutate: toggleFavorite, isPending: isTogglingFavorite } =
    useToggleFavorite();
  const { mutate: duplicateBoard } = useDuplicateBoard();
  const { mutate: togglePrivacy } = useToggleBoardPrivacy();
  const { mutate: exportBoard } = useExportBoard();

  const openBoard = () => router.push(`/app/board/${board.id}`);
  const openDetails = () => {
    openModal(
      "Редактировать доску",
      <EditBoardForm
        board={board}
        index={index}
        onDeleted={closeModal}
      />,
      "xl",
      true,
      true,
    );
  };
  
  return {
    menuButtonRef,
    menuOpen,
    setMenuOpen,
    toggleMenu: () => setMenuOpen((v) => !v),
    closeMenu: () => setMenuOpen(false),
    renameOpen,
    openRename: () => setRenameOpen(true),
    closeRename: () => setRenameOpen(false),
    deleteOpen,
    openDelete: () => setDeleteOpen(true),
    closeDelete: () => setDeleteOpen(false),
    thumbnailOpen,
    openThumbnail: () => setThumbnailOpen(true),
    closeThumbnail: () => setThumbnailOpen(false),
    moveOpen,
    openMove: () => setMoveOpen(true),
    closeMove: () => setMoveOpen(false),
    openBoard,
    toggleFavorite: () => toggleFavorite(board.id),
    duplicate: () => duplicateBoard(board.id),
    togglePrivate: () =>
      togglePrivacy({ id: board.id, isPrivate: !board.isPrivate }),
    exportBackup: () => exportBoard(board.id),
    openDetails,
    isTogglingFavorite,
  };
}
export type TUseBoardActionsReturn = ReturnType<typeof useBoardActions>;
