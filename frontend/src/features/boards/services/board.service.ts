import { axiosInstance } from "@/shared/config/axios.config";
import {
  IBoard,
  IBoardActionResponse,
  IFavoriteBoardResponse,
  ICreateBoardDto,
  IUpdateBoardDto,
  IGetBoardsParams,
  IExportBoardResponse,
  IMoveBoardDto,
} from "../interfaces/board.interface";

// HTTP-сервис boards: CRUD, favorites, duplicate, export, move.
class BoardService {
  async getBoards(params?: IGetBoardsParams): Promise<IBoard[]> {
    const response = await axiosInstance.get("/boards", { params });
    return response.data;
  }

  async getFavoriteBoards(): Promise<IBoard[]> {
    const response = await axiosInstance.get("/boards/favorites");
    return response.data;
  }

  async getBoardById(id: string): Promise<IBoard> {
    const response = await axiosInstance.get(`/boards/${id}`);
    return response.data;
  }

  async createBoard(data: ICreateBoardDto): Promise<IBoard> {
    const response = await axiosInstance.post("/boards", data);
    return response.data;
  }

  async updateBoard(id: string, data: IUpdateBoardDto): Promise<IBoard> {
    const response = await axiosInstance.patch(`/boards/${id}`, data);
    return response.data;
  }

  async deleteBoard(id: string): Promise<IBoardActionResponse> {
    const response = await axiosInstance.delete(`/boards/${id}`);
    return response.data;
  }

  async duplicateBoard(id: string): Promise<IBoard> {
    const response = await axiosInstance.post(`/boards/${id}/duplicate`);
    return response.data;
  }

  async toggleFavorite(id: string): Promise<IFavoriteBoardResponse> {
    const response = await axiosInstance.post(`/boards/${id}/favorite`);
    return response.data;
  }

  async exportBoard(id: string): Promise<IExportBoardResponse> {
    const response = await axiosInstance.get(`/boards/${id}/export`);
    return response.data;
  }

  async moveBoard(id: string, data: IMoveBoardDto): Promise<IBoard> {
    const response = await axiosInstance.patch(`/boards/${id}/move`, data);
    return response.data;
  }
}

export const boardService = new BoardService();
