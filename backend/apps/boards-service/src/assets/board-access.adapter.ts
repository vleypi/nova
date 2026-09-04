import { Injectable } from '@nestjs/common';
import { BoardsService } from '../boards/boards.service';
import { SpacesService } from '../boards/spaces.service';
import { BoardAccessChecker } from './assets.service';

@Injectable()
export class BoardAccessAdapter implements BoardAccessChecker {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly spacesService: SpacesService,
  ) {}

  async canWriteBoard({ boardId, userId }: { boardId: string; userId: string }) {
    try {
      const board = await this.boardsService.getBoard(boardId, userId);
      return { allowed: true as const, spaceId: board.spaceId };
    } catch {
      return { allowed: false as const };
    }
  }

  async canReadSpace({ spaceId, userId }: { spaceId: string; userId: string }) {
    try {
      await this.spacesService.getSpace(spaceId, userId);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  }
}
