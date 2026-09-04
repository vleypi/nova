import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, Like } from 'typeorm';
import { SpaceRole, fillMonthlyBuckets } from '@app/common';
import { Board } from './entities/board.entity';
import { Favorite } from './entities/favorite.entity';
import { CanvasElement } from './entities/canvas-element.entity';
import { SpacesService } from './spaces.service';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(Favorite)
    private readonly favRepo: Repository<Favorite>,
    @InjectRepository(CanvasElement)
    private readonly elementRepo: Repository<CanvasElement>,
    private readonly spacesService: SpacesService,
  ) {}

  async getBoards(
    userId: string,
    spaceId?: string,
  ) {
    let boards: Board[];

    if (spaceId) {
      await this.spacesService.requireMember(spaceId, userId);
      boards = await this.boardRepo.find({ where: { spaceId } });
    } else {
      const spaces = await this.spacesService.getSpaces(userId);
      if (spaces.length === 0) return [];
      const spaceIds = spaces.map((s) => s.id);
      boards = await this.boardRepo.find({
        where: { spaceId: In(spaceIds) },
      });
    }

    boards = boards.filter(
      (b) => !b.isPrivate || b.createdBy === userId,
    );

    return this.attachFavorites(boards, userId);
  }

  async getFavorites(userId: string) {
    const favs = await this.favRepo.find({
      where: { userId },
      relations: ['board'],
    });

    const results: { isFavorite: boolean; id: string; name: string; spaceId: string; createdBy: string; isPrivate: boolean; thumbnail: string; createdAt: Date; updatedAt: Date }[] = [];

    for (const fav of favs) {
      if (!fav.board) continue;
      if (fav.board.isPrivate && fav.board.createdBy !== userId) continue;

      const member = await this.spacesService.findMember(
        fav.board.spaceId,
        userId,
      );
      if (!member) continue;

      results.push({ ...fav.board, isFavorite: true });
    }

    return results;
  }

  async getBoard(
    id: string,
    userId: string,
  ) {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    await this.spacesService.requireMember(board.spaceId, userId);

    if (board.isPrivate && board.createdBy !== userId) {
      throw new RpcException('Нет доступа к доске');
    }

    const fav = await this.favRepo.findOne({
      where: { userId, boardId: id },
    });
    return { ...board, isFavorite: !!fav };
  }

  async createBoard(
    name: string,
    createdBy: string,
    spaceId: string,
  ) {
    const member = await this.spacesService.requireMember(spaceId, createdBy);

    if (member.role !== SpaceRole.OWNER && !member.canCreateBoards) {
      throw new RpcException('Нет прав на создание досок');
    }

    const board = this.boardRepo.create({ name, createdBy, spaceId });
    const saved = await this.boardRepo.save(board);
    return { ...saved, isFavorite: false };
  }

  async updateBoard(
    id: string,
    userId: string,
    data: { name?: string; isPrivate?: boolean; thumbnail?: string },
  ) {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    const member = await this.spacesService.requireMember(
      board.spaceId,
      userId,
    );

    if (member.role !== SpaceRole.OWNER && !member.canEditBoards) {
      throw new RpcException('Нет прав на редактирование досок');
    }

    const update: Partial<Board> = {};
    if (data.name !== undefined && data.name !== '') update.name = data.name;
    if (data.isPrivate !== undefined) update.isPrivate = data.isPrivate;
    if (data.thumbnail !== undefined) update.thumbnail = data.thumbnail;

    if (Object.keys(update).length > 0) {
      await this.boardRepo.update(id, update);
    }

    const updated = await this.boardRepo.findOne({ where: { id } });
    const fav = await this.favRepo.findOne({
      where: { userId, boardId: id },
    });
    return { ...updated, isFavorite: !!fav };
  }

  async deleteBoard(id: string, userId: string): Promise<void> {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    const member = await this.spacesService.requireMember(
      board.spaceId,
      userId,
    );

    if (member.role === SpaceRole.OWNER) {
      await this.boardRepo.delete(id);
      return;
    }

    if (board.createdBy !== userId) {
      throw new RpcException('Нет прав на удаление этой доски');
    }
    if (!member.canDeleteBoards) {
      throw new RpcException('Нет прав на удаление досок');
    }

    await this.boardRepo.delete(id);
  }

  async duplicateBoard(
    id: string,
    userId: string,
  ) {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    const member = await this.spacesService.requireMember(
      board.spaceId,
      userId,
    );

    if (member.role !== SpaceRole.OWNER && !member.canCreateBoards) {
      throw new RpcException('Нет прав на создание досок');
    }

    if (board.isPrivate && board.createdBy !== userId) {
      throw new RpcException('Нет доступа к доске');
    }

    const duplicate = this.boardRepo.create({
      name: `${board.name} (копия)`,
      createdBy: userId,
      spaceId: board.spaceId,
      isPrivate: false,
    });
    const saved = await this.boardRepo.save(duplicate);
    return { ...saved, isFavorite: false };
  }

  async toggleFavorite(
    userId: string,
    boardId: string,
  ): Promise<{ isFavorite: boolean; boardId: string }> {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new RpcException('Доска не найдена');

    await this.spacesService.requireMember(board.spaceId, userId);

    const existing = await this.favRepo.findOne({
      where: { userId, boardId },
    });

    if (existing) {
      await this.favRepo.delete(existing.id);
      return { isFavorite: false, boardId };
    }

    const fav = this.favRepo.create({ userId, boardId });
    await this.favRepo.save(fav);
    return { isFavorite: true, boardId };
  }
      
  async exportBoard(id: string, userId: string) {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    await this.spacesService.requireMember(board.spaceId, userId);

    if (board.isPrivate && board.createdBy !== userId) {
      throw new RpcException('Нет доступа к доске');
    }

    const elements = await this.elementRepo.find({
      where: { boardId: id },
      order: { zIndex: 'ASC' },
    });

    return { board, elements };
  }

  async moveBoard(id: string, userId: string, targetSpaceId: string) {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');

    if (board.spaceId === targetSpaceId) {
      throw new RpcException('Доска уже находится в этом пространстве');
    }

    // Check permissions in source space
    const sourceMember = await this.spacesService.requireMember(board.spaceId, userId);
    if (sourceMember.role !== SpaceRole.OWNER) {
      if (board.createdBy !== userId) {
        throw new RpcException('Нет прав на перемещение этой доски');
      }
      if (!sourceMember.canDeleteBoards) {
        throw new RpcException('Нет прав на перемещение досок из этого пространства');
      }
    }

    // Check permissions in target space
    const targetMember = await this.spacesService.requireMember(targetSpaceId, userId);
    if (targetMember.role !== SpaceRole.OWNER && !targetMember.canCreateBoards) {
      throw new RpcException('Нет прав на добавление досок в целевое пространство');
    }

    await this.boardRepo.update(id, { spaceId: targetSpaceId });

    const updated = await this.boardRepo.findOne({ where: { id } });
    const fav = await this.favRepo.findOne({ where: { userId, boardId: id } });
    return { ...updated, isFavorite: !!fav };
  }

  async adminGetBoards(
    page = 1,
    limit = 20,
    search?: string,
    createdBy?: string,
    privacy?: 'public' | 'private' | '',
    spaceId?: string,
  ) {
    const qb = this.boardRepo.createQueryBuilder('b').orderBy('b.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(b.name ILIKE :s OR b.id::text ILIKE :s)', { s: `%${search}%` });
    }
    if (createdBy)             qb.andWhere('b.createdBy = :cb', { cb: createdBy });
    if (privacy === 'public')  qb.andWhere('b.isPrivate = :p', { p: false });
    if (privacy === 'private') qb.andWhere('b.isPrivate = :p', { p: true });
    if (spaceId)               qb.andWhere('b.spaceId = :sid', { sid: spaceId });

    const [boards, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { boards, total, page, totalPages: Math.ceil(total / limit) };
  }

  async adminDeleteBoard(id: string): Promise<void> {
    const board = await this.boardRepo.findOne({ where: { id } });
    if (!board) throw new RpcException('Доска не найдена');
    await this.boardRepo.delete(id);
  }

  async getUserBoardStats(userId: string) {
    const boardsCreated = await this.boardRepo.count({ where: { createdBy: userId } });
    return { boardsCreated };
  }

  async getBoardStats() {
    const totalBoards = await this.boardRepo.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBoards = await this.boardRepo.count({ where: { createdAt: MoreThanOrEqual(today) } });
    return { totalBoards, todayBoards };
  }

  /** Boards created per month for the last `months` buckets (oldest → newest). */
  async getCreatedByMonth(months: number): Promise<number[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const rows: { bucket: Date; count: string }[] = await this.boardRepo
      .createQueryBuilder('b')
      .select(`date_trunc('month', b."createdAt")`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('b."createdAt" >= :since', { since })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return fillMonthlyBuckets(rows, months);
  }

  private async attachFavorites(
    boards: Board[],
    userId: string,
  ) {
    if (boards.length === 0) return [];

    const boardIds = boards.map((b) => b.id);
    const favs = await this.favRepo.find({
      where: { userId, boardId: In(boardIds) },
    });
    const favSet = new Set(favs.map((f) => f.boardId));

    return boards.map((b) => ({ ...b, isFavorite: favSet.has(b.id) }));
  }
}
