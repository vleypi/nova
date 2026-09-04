import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { fillDailyBuckets } from '@app/common';
import { AuditLog } from './entities/audit-log.entity';

interface CreateAuditLogData {
  actorId:    string;
  actorEmail: string;
  action:     string;
  targetId?:  string;
  targetType?: string;
  details?:   string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const log = this.repo.create(data);
    return this.repo.save(log);
  }

  async findAll(page = 1, limit = 20, action?: string, actorId?: string, targetId?: string) {
    const where: Record<string, unknown> = {};
    if (action)   where['action']   = Like(`%${action}%`);
    if (actorId)  where['actorId']  = actorId;
    if (targetId) where['targetId'] = targetId;

    const [logs, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getActivityByDay(days: number): Promise<{ daily: number[]; total: number }> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows: { bucket: Date; count: string }[] = await this.repo
      .createQueryBuilder('a')
      .select(`date_trunc('day', a."createdAt")`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('a."createdAt" >= :since', { since })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return fillDailyBuckets(rows, days);
  }
}
