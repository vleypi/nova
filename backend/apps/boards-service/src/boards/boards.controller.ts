import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { BoardsService } from './boards.service';
import { SpacesService } from './spaces.service';
import { Space } from './entities/space.entity';
import { SpaceMember } from './entities/space-member.entity';

interface BoardWithFavorite {
  id: string;
  name: string;
  createdBy: string;
  spaceId: string;
  isPrivate: boolean;
  thumbnail?: string | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const toBoardResponse = (board: BoardWithFavorite) => ({
  id:         board.id,
  name:       board.name,
  createdBy:  board.createdBy,
  spaceId:    board.spaceId,
  isPrivate:  board.isPrivate,
  thumbnail:  board.thumbnail ?? '',
  isFavorite: board.isFavorite,
  createdAt:  board.createdAt.toISOString(),
  updatedAt:  board.updatedAt.toISOString(),
});

const toSpaceResponse = (space: Space) => ({
  id:         space.id,
  name:       space.name,
  ownerId:    space.ownerId,
  inviteCode: space.inviteCode,
  createdAt:  space.createdAt.toISOString(),
  updatedAt:  space.updatedAt.toISOString(),
});

const toMemberResponse = (m: SpaceMember) => ({
  id:              m.id,
  userId:          m.userId,
  spaceId:         m.spaceId,
  role:            m.role,
  canCreateBoards: m.canCreateBoards,
  canEditBoards:   m.canEditBoards,
  canDraw:         m.canDraw,
  canDeleteBoards: m.canDeleteBoards,
  joinedAt:        m.joinedAt.toISOString(),
});

@Controller()
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly spacesService: SpacesService,
  ) {}

  @GrpcMethod('BoardsService', 'GetBoards')
  async getBoards(data: { userId: string; spaceId?: string }) {
    const boards = await this.boardsService.getBoards(data.userId, data.spaceId);
    return { boards: boards.map(toBoardResponse) };
  }

  @GrpcMethod('BoardsService', 'GetFavorites')
  async getFavorites(data: { userId: string }) {
    const boards = await this.boardsService.getFavorites(data.userId);
    return { boards: boards.map(toBoardResponse) };
  }

  @GrpcMethod('BoardsService', 'GetBoard')
  async getBoard(data: { id: string; userId: string }) {
    const board = await this.boardsService.getBoard(data.id, data.userId);
    return toBoardResponse(board);
  }

  @GrpcMethod('BoardsService', 'CreateBoard')
  async createBoard(data: { name: string; createdBy: string; spaceId: string }) {
    const board = await this.boardsService.createBoard(
      data.name,
      data.createdBy,
      data.spaceId,
    );
    return toBoardResponse(board);
  }

  @GrpcMethod('BoardsService', 'UpdateBoard')
  async updateBoard(data: {
    id: string;
    userId: string;
    name?: string;
    isPrivate?: boolean;
    thumbnail?: string;
  }) {
    const board = await this.boardsService.updateBoard(data.id, data.userId, {
      name: data.name,
      isPrivate: data.isPrivate,
      thumbnail: data.thumbnail,
    });
    return toBoardResponse(board);
  }

  @GrpcMethod('BoardsService', 'DeleteBoard')
  async deleteBoard(data: { id: string; userId: string }) {
    await this.boardsService.deleteBoard(data.id, data.userId);
    return { success: true, message: 'Доска удалена' };
  }

  @GrpcMethod('BoardsService', 'DuplicateBoard')
  async duplicateBoard(data: { id: string; userId: string }) {
    const board = await this.boardsService.duplicateBoard(data.id, data.userId);
    return toBoardResponse(board);
  }

  @GrpcMethod('BoardsService', 'ToggleFavorite')
  async toggleFavorite(data: { userId: string; boardId: string }) {
    return this.boardsService.toggleFavorite(data.userId, data.boardId);
  }

  @GrpcMethod('BoardsService', 'ExportBoard')
  async exportBoard(data: { id: string; userId: string }) {
    const { board, elements } = await this.boardsService.exportBoard(data.id, data.userId);
    return {
      id:        board.id,
      name:      board.name,
      createdBy: board.createdBy,
      spaceId:   board.spaceId,
      isPrivate: board.isPrivate,
      thumbnail: board.thumbnail ?? '',
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
      elements:  elements.map((el) => ({
        id:        el.id,
        type:      el.type,
        x:         el.x,
        y:         el.y,
        width:     el.width,
        height:    el.height,
        rotation:  el.rotation,
        zIndex:    el.zIndex,
        opacity:   el.opacity,
        data:      JSON.stringify(el.data),
        isLocked:  el.isLocked,
        createdBy: el.createdBy,
        updatedBy: el.updatedBy ?? '',
        createdAt: el.createdAt.toISOString(),
        updatedAt: el.updatedAt.toISOString(),
      })),
    };
  }

  @GrpcMethod('BoardsService', 'MoveBoard')
  async moveBoard(data: { id: string; userId: string; targetSpaceId: string }) {
    const board = await this.boardsService.moveBoard(data.id, data.userId, data.targetSpaceId);
    return toBoardResponse(board);
  }

  @GrpcMethod('BoardsService', 'GetSpaces')
  async getSpaces(data: { userId: string }) {
    const spaces = await this.spacesService.getSpaces(data.userId);
    return { spaces: spaces.map(toSpaceResponse) };
  }

  @GrpcMethod('BoardsService', 'GetSpace')
  async getSpace(data: { id: string; userId: string }) {
    const space = await this.spacesService.getSpace(data.id, data.userId);
    return {
      id:         space.id,
      name:       space.name,
      ownerId:    space.ownerId,
      inviteCode: space.userRole === 'OWNER' ? space.inviteCode : '',
      userRole:   space.userRole,
      createdAt:  space.createdAt.toISOString(),
      updatedAt:  space.updatedAt.toISOString(),
    };
  }

  @GrpcMethod('BoardsService', 'CreateSpace')
  async createSpace(data: { name: string; ownerId: string }) {
    const space = await this.spacesService.createSpace(data.name, data.ownerId);
    return toSpaceResponse(space);
  }

  @GrpcMethod('BoardsService', 'UpdateSpace')
  async updateSpace(data: { id: string; userId: string; name: string }) {
    const space = await this.spacesService.updateSpace(
      data.id,
      data.userId,
      data.name,
    );
    return toSpaceResponse(space);
  }

  @GrpcMethod('BoardsService', 'DeleteSpace')
  async deleteSpace(data: { id: string; userId: string }) {
    await this.spacesService.deleteSpace(data.id, data.userId);
    return { success: true, message: 'Пространство удалено' };
  }

  @GrpcMethod('BoardsService', 'GetSpaceMembers')
  async getSpaceMembers(data: { spaceId: string; userId: string }) {
    const members = await this.spacesService.getMembers(
      data.spaceId,
      data.userId,
    );
    return { members: members.map(toMemberResponse) };
  }

  @GrpcMethod('BoardsService', 'AdminGetSpaceMembers')
  async adminGetSpaceMembers(data: { spaceId: string }) {
    const members = await this.spacesService.adminGetMembers(data.spaceId);
    return { members: members.map(toMemberResponse) };
  }

  @GrpcMethod('BoardsService', 'AdminDeleteSpace')
  async adminDeleteSpace(data: { id: string }) {
    await this.spacesService.adminDeleteSpace(data.id);
    return { success: true, message: 'Пространство удалено' };
  }

  @GrpcMethod('BoardsService', 'GetBoardsTimeseries')
  async getBoardsTimeseries(data: { months?: number }) {
    const months = Math.max(1, Math.min(36, data.months || 6));
    const [boardsMonthly, spacesMonthly] = await Promise.all([
      this.boardsService.getCreatedByMonth(months),
      this.spacesService.getCreatedByMonth(months),
    ]);
    return { boardsMonthly, spacesMonthly };
  }

  @GrpcMethod('BoardsService', 'JoinByInvite')
  async joinByInvite(data: { inviteCode: string; userId: string }) {
    const { space, alreadyMember } = await this.spacesService.joinByInvite(
      data.inviteCode,
      data.userId,
    );
    return { space: toSpaceResponse(space), alreadyMember };
  }

  @GrpcMethod('BoardsService', 'RemoveMember')
  async removeMember(data: {
    spaceId: string;
    userId: string;
    targetUserId: string;
  }) {
    await this.spacesService.removeMember(
      data.spaceId,
      data.userId,
      data.targetUserId,
    );
    return { success: true, message: 'Участник удалён' };
  }

  @GrpcMethod('BoardsService', 'LeaveSpace')
  async leaveSpace(data: { spaceId: string; userId: string }) {
    await this.spacesService.leaveSpace(data.spaceId, data.userId);
    return { success: true, message: 'Вы покинули пространство' };
  }

  @GrpcMethod('BoardsService', 'UpdateMemberPermissions')
  async updateMemberPermissions(data: {
    spaceId: string;
    userId: string;
    targetUserId: string;
    canCreateBoards: boolean;
    canEditBoards: boolean;
    canDraw: boolean;
    canDeleteBoards: boolean;
  }) {
    const member = await this.spacesService.updateMemberPermissions(
      data.spaceId,
      data.userId,
      data.targetUserId,
      {
        canCreateBoards: data.canCreateBoards,
        canEditBoards: data.canEditBoards,
        canDraw: data.canDraw,
        canDeleteBoards: data.canDeleteBoards,
      },
    );
    return toMemberResponse(member);
  }

  @GrpcMethod('BoardsService', 'TransferOwnership')
  async transferOwnership(data: {
    spaceId: string;
    userId: string;
    targetUserId: string;
  }) {
    return this.spacesService.transferOwnership(
      data.spaceId,
      data.userId,
      data.targetUserId,
    );
  }

  @GrpcMethod('BoardsService', 'RegenerateInviteCode')
  async regenerateInviteCode(data: { spaceId: string; userId: string }) {
    const inviteCode = await this.spacesService.regenerateInviteCode(
      data.spaceId,
      data.userId,
    );
    return { inviteCode };
  }

  @GrpcMethod('BoardsService', 'AdminGetBoards')
  async adminGetBoards(data: { page?: number; limit?: number; search?: string; createdBy?: string; privacy?: 'public' | 'private' | ''; spaceId?: string }) {
    const res = await this.boardsService.adminGetBoards(
      data.page  || 1,
      data.limit || 20,
      data.search    || undefined,
      data.createdBy || undefined,
      data.privacy   || undefined,
      data.spaceId   || undefined,
    );
    return {
      boards:     res.boards.map(b => toBoardResponse({ ...b, isFavorite: false })),
      total:      res.total,
      page:       res.page,
      totalPages: res.totalPages,
    };
  }

  @GrpcMethod('BoardsService', 'AdminGetSpaces')
  async adminGetSpaces(data: { page?: number; limit?: number; search?: string; memberId?: string }) {
    const res = await this.spacesService.adminGetSpaces(
      data.page  || 1,
      data.limit || 20,
      data.search   || undefined,
      data.memberId || undefined,
    );
    return {
      spaces: res.spaces.map(s => ({
        id:           s.id,
        name:         s.name,
        ownerId:      s.ownerId,
        inviteCode:   s.inviteCode,
        membersCount: s.membersCount,
        createdAt:    s.createdAt.toISOString(),
        updatedAt:    s.updatedAt.toISOString(),
      })),
      total:      res.total,
      page:       res.page,
      totalPages: res.totalPages,
    };
  }

  @GrpcMethod('BoardsService', 'AdminDeleteBoard')
  async adminDeleteBoard(data: { id: string }) {
    await this.boardsService.adminDeleteBoard(data.id);
    return { success: true, message: 'Доска удалена администратором' };
  }

  @GrpcMethod('BoardsService', 'GetUserBoardStats')
  async getUserBoardStats(data: { userId: string }) {
    const [{ boardsCreated }, spacesCount] = await Promise.all([
      this.boardsService.getUserBoardStats(data.userId),
      this.spacesService.getUserSpacesCount(data.userId),
    ]);
    return { boardsCreated, spacesCount };
  }

  @GrpcMethod('BoardsService', 'GetBoardStats')
  async getBoardStats() {
    const [boardStats, spaceStats] = await Promise.all([
      this.boardsService.getBoardStats(),
      this.spacesService.getSpaceStats(),
    ]);
    return {
      totalBoards:  boardStats.totalBoards,
      todayBoards:  boardStats.todayBoards,
      totalSpaces:  spaceStats.totalSpaces,
      todaySpaces:  spaceStats.todaySpaces,
    };
  }
}
