import type { ReactNode } from "react";
import type { TViewMode } from "./filter.interface";

export interface IBoardCreator {
  id: string;
  name: string;
  avatar: string;
}

export interface IBoard {
  id: string;
  name: string;
  isPrivate: boolean;
  isFavorite: boolean;
  thumbnail: string;
  spaceId: string;
  createdByUser: IBoardCreator | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateBoardDto {
  name?: string;
  spaceId: string;
}

export interface IUpdateBoardDto {
  name?: string;
  isPrivate?: boolean;
  thumbnail?: string;
}

export interface IGetBoardsParams {
  spaceId?: string;
}

export interface IBoardActionResponse {
  message: string;
  success: boolean;
}

export interface IFavoriteBoardResponse {
  message: string;
  success: boolean;
  isFavorite: boolean;
}

export interface ICanvasElementExport {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  data: string;
  isLocked: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IExportBoardResponse {
  id: string;
  name: string;
  createdBy: string;
  spaceId: string;
  isPrivate: boolean;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  elements: ICanvasElementExport[];
}

export interface IMoveBoardDto {
  targetSpaceId: string;
}

export interface IBoardItemProps {
  board: IBoard;
  index: number;
}

export interface IBoardListProps {
  boards?: IBoard[];
  isLoading?: boolean;
  isError?: boolean;
  emptyContent?: ReactNode;
  viewMode?: TViewMode;
}
