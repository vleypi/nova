import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Role, fillMonthlyBuckets } from '@app/common';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new RpcException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findAll(params: {
    page?:   number;
    limit?:  number;
    search?: string;
    role?:   string;
    status?: 'active' | 'blocked' | '';
  } = {}): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(10000, Math.max(1, params.limit ?? 20));
    const qb = this.repo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (params.search) {
      qb.andWhere('(LOWER(u.email) LIKE :q OR LOWER(u.name) LIKE :q)', {
        q: `%${params.search.toLowerCase()}%`,
      });
    }
    if (params.role && Object.values(Role).includes(params.role as Role)) {
      qb.andWhere('u.role = :role', { role: params.role });
    }
    if (params.status === 'active')  qb.andWhere('u.isBlocked = :b', { b: false });
    if (params.status === 'blocked') qb.andWhere('u.isBlocked = :b', { b: true });

    const [users, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { users, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    return this.repo.findBy({ id: In(ids) });
  }

  async create(email: string): Promise<User> {
    const count = await this.repo.count();
    const role = count === 0 ? Role.SUPER_ADMIN : Role.USER;

    const name = email.split('@')[0];
    const user = this.repo.create({ email, role, name });
    return this.repo.save(user);
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'name' | 'avatar'>>): Promise<User> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async updateRole(id: string, role: Role): Promise<User> {
    await this.repo.update(id, { role });
    return this.findById(id);
  }

  async blockUser(id: string, isBlocked: boolean): Promise<User> {
    await this.repo.update(id, { isBlocked });
    return this.findById(id);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.repo.remove(user);
  }

  async linkProvider(id: string, provider: string, providerId: string): Promise<User> {
    const field = provider === 'google' ? 'googleId' : provider === 'github' ? 'githubId' : null;
    if (!field) throw new RpcException('Неизвестный провайдер');
    if (!providerId) throw new RpcException('Пустой идентификатор провайдера');

    const existing = await this.repo.findOne({ where: { [field]: providerId } });
    if (existing && existing.id !== id) {
      throw new RpcException('PROVIDER_ALREADY_LINKED');
    }

    await this.repo.update(id, { [field]: providerId });
    return this.findById(id);
  }

  async findByProviderId(provider: string, providerId: string): Promise<User | null> {
    const field = provider === 'google' ? 'googleId' : provider === 'github' ? 'githubId' : null;
    if (!field || !providerId) return null;
    return this.repo.findOne({ where: { [field]: providerId } });
  }

  async unlinkProvider(id: string, provider: string): Promise<User> {
    const field = provider === 'google' ? 'googleId' : provider === 'github' ? 'githubId' : null;
    if (!field) throw new RpcException('Неизвестный провайдер');
    await this.repo.update(id, { [field]: null });
    return this.findById(id);
  }

  async getStats() {
    const totalUsers   = await this.repo.count();
    const blockedUsers = await this.repo.count({ where: { isBlocked: true } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = await this.repo.count({ where: { createdAt: MoreThanOrEqual(today) } });
    return { totalUsers, todayUsers, blockedUsers };
  }
  
  async getCreatedByMonth(months: number): Promise<number[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const rows: { bucket: Date; count: string }[] = await this.repo
      .createQueryBuilder('u')
      .select(`date_trunc('month', u."createdAt")`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('u."createdAt" >= :since', { since })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return fillMonthlyBuckets(rows, months);
  }
}
