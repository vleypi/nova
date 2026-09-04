import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual, In } from 'typeorm';
import { SpaceRole, fillMonthlyBuckets } from '@app/common';
import { Space } from './entities/space.entity';
import { SpaceMember } from './entities/space-member.entity';
import { generateShortId } from '@app/common';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly memberRepo: Repository<SpaceMember>,
  ) {}

  async getSpaces(userId: string): Promise<Space[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['space'],
    });
    return memberships.map((m) => m.space);
  }

  async getSpace(id: string, userId: string) {
    const space = await this.spaceRepo.findOne({ where: { id } });
    if (!space) throw new RpcException('Пространство не найдено');

    const member = await this.memberRepo.findOne({
      where: { spaceId: id, userId },
    });
    if (!member) throw new RpcException('Нет доступа к пространству');

    return { ...space, userRole: member.role };
  }

  async createSpace(name: string, ownerId: string): Promise<Space> {
    const inviteCode = generateShortId();
    const space = this.spaceRepo.create({ name, ownerId, inviteCode });
    const saved = await this.spaceRepo.save(space);

    const owner = this.memberRepo.create({
      spaceId: saved.id,
      userId: ownerId,
      role: SpaceRole.OWNER,
    });
    await this.memberRepo.save(owner);

    return saved;
  }

  async updateSpace(id: string, userId: string, name: string): Promise<Space> {
    const member = await this.requireMember(id, userId);
    if (member.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может редактировать пространство');
    }

    await this.spaceRepo.update(id, { name });
    return this.spaceRepo.findOne({ where: { id } });
  }

  async deleteSpace(id: string, userId: string): Promise<void> {
    const member = await this.requireMember(id, userId);
    if (member.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может удалить пространство');
    }

    await this.spaceRepo.delete(id);
  }

  async getMembers(spaceId: string, userId: string): Promise<SpaceMember[]> {
    await this.requireMember(spaceId, userId);
    return this.memberRepo.find({ where: { spaceId } });
  }

  /** Admin-only: fetch members of any space without a membership check. */
  async adminGetMembers(spaceId: string): Promise<SpaceMember[]> {
    return this.memberRepo.find({ where: { spaceId } });
  }

  /** Admin-only: delete any space regardless of ownership. */
  async adminDeleteSpace(id: string): Promise<void> {
    const space = await this.spaceRepo.findOne({ where: { id } });
    if (!space) throw new RpcException('Пространство не найдено');
    await this.spaceRepo.delete(id);
  }

  async joinByInvite(
    inviteCode: string,
    userId: string,
  ): Promise<{ space: Space; alreadyMember: boolean }> {
    const space = await this.spaceRepo.findOne({ where: { inviteCode } });
    if (!space) throw new RpcException('Невалидный invite-код');

    const existing = await this.memberRepo.findOne({
      where: { spaceId: space.id, userId },
    });
    // Уже участник: возвращаем space без ошибки, gateway отдаст 409 с spaceId.
    if (existing) return { space, alreadyMember: true };

    const member = this.memberRepo.create({
      spaceId: space.id,
      userId,
      role: SpaceRole.MEMBER,
    });
    await this.memberRepo.save(member);

    return { space, alreadyMember: false };
  }

  async removeMember(
    spaceId: string,
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    const requester = await this.requireMember(spaceId, userId);
    if (requester.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может удалять участников');
    }
    if (userId === targetUserId) {
      throw new RpcException('Владелец не может удалить себя');
    }

    const target = await this.memberRepo.findOne({
      where: { spaceId, userId: targetUserId },
    });
    if (!target) throw new RpcException('Участник не найден');

    await this.memberRepo.delete(target.id);
  }

  async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const member = await this.requireMember(spaceId, userId);
    if (member.role === SpaceRole.OWNER) {
      throw new RpcException('Владелец не может покинуть пространство');
    }

    await this.memberRepo.delete(member.id);
  }

  async updateMemberPermissions(
    spaceId: string,
    userId: string,
    targetUserId: string,
    permissions: {
      canCreateBoards: boolean;
      canEditBoards: boolean;
      canDraw: boolean;
      canDeleteBoards: boolean;
    },
  ): Promise<SpaceMember> {
    const requester = await this.requireMember(spaceId, userId);
    if (requester.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может управлять permissions');
    }

    const target = await this.memberRepo.findOne({
      where: { spaceId, userId: targetUserId },
    });
    if (!target) throw new RpcException('Участник не найден');
    if (target.role === SpaceRole.OWNER) {
      throw new RpcException('Нельзя менять permissions владельца');
    }

    await this.memberRepo.update(target.id, permissions);
    return this.memberRepo.findOne({ where: { id: target.id } });
  }

  async transferOwnership(
    spaceId: string,
    userId: string,
    targetUserId: string,
  ): Promise<{ spaceId: string; newOwnerId: string; previousOwnerId: string }> {
    if (userId === targetUserId) {
      throw new RpcException('Нельзя передать владение самому себе');
    }

    const requester = await this.requireMember(spaceId, userId);
    if (requester.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может передать права владения');
    }

    const target = await this.memberRepo.findOne({
      where: { spaceId, userId: targetUserId },
    });
    if (!target) throw new RpcException('Участник не найден в пространстве');

    // Назначаем новому владельцу роль OWNER
    await this.memberRepo.update(target.id, { role: SpaceRole.OWNER });
    // Понижаем предыдущего владельца до MEMBER
    await this.memberRepo.update(requester.id, { role: SpaceRole.MEMBER });
    // Обновляем ownerId в самом пространстве
    await this.spaceRepo.update(spaceId, { ownerId: targetUserId });

    return { spaceId, newOwnerId: targetUserId, previousOwnerId: userId };
  }

  async regenerateInviteCode(spaceId: string, userId: string): Promise<string> {
    const member = await this.requireMember(spaceId, userId);
    if (member.role !== SpaceRole.OWNER) {
      throw new RpcException('Только владелец может перегенерировать invite-код');
    }

    const newCode = generateShortId();
    await this.spaceRepo.update(spaceId, { inviteCode: newCode });
    return newCode;
  }
  
  async getUserSpacesCount(userId: string): Promise<number> {
    return this.memberRepo.count({ where: { userId } });
  }

  /** Spaces created per month for the last `months` buckets (oldest → newest). */
  async getCreatedByMonth(months: number): Promise<number[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const rows: { bucket: Date; count: string }[] = await this.spaceRepo
      .createQueryBuilder('s')
      .select(`date_trunc('month', s."createdAt")`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('s."createdAt" >= :since', { since })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return fillMonthlyBuckets(rows, months);
  }

  async adminGetSpaces(page = 1, limit = 20, search?: string, memberId?: string) {
    const qb = this.spaceRepo.createQueryBuilder('s').orderBy('s.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(s.name ILIKE :q OR s.id::text ILIKE :q)', { q: `%${search}%` });
    }

    // Filter by membership — list only spaces where the given user participates.
    if (memberId) {
      const memberships = await this.memberRepo.find({
        where: { userId: memberId },
        select: ['spaceId'],
      });
      const spaceIds = memberships.map((m) => m.spaceId);
      if (spaceIds.length === 0) {
        return { spaces: [], total: 0, page, totalPages: 0 };
      }
      qb.andWhere('s.id IN (:...ids)', { ids: spaceIds });
    }

    const [spaces, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const result = await Promise.all(
      spaces.map(async (s) => {
        const membersCount = await this.memberRepo.count({ where: { spaceId: s.id } });
        return { ...s, membersCount };
      }),
    );
    return { spaces: result, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getSpaceStats() {
    const totalSpaces = await this.spaceRepo.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySpaces = await this.spaceRepo.count({ where: { createdAt: MoreThanOrEqual(today) } });
    return { totalSpaces, todaySpaces };
  }

  async findMember(spaceId: string, userId: string): Promise<SpaceMember | null> {
    return this.memberRepo.findOne({ where: { spaceId, userId } });
  }

  async requireMember(spaceId: string, userId: string): Promise<SpaceMember> {
    const member = await this.memberRepo.findOne({
      where: { spaceId, userId },
    });
    if (!member) throw new RpcException('Нет доступа к пространству');
    return member;
  }
}
