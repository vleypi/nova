import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import { DataSource } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { AuditLog } from './src/users/entities/audit-log.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
  username: process.env.POSTGRES_USER ?? 'nova',
  password: process.env.POSTGRES_PASSWORD ?? 'nova_secret',
  database: process.env.POSTGRES_USERS_DB ?? 'nova_users',
  entities: [User, AuditLog],
  migrations: ['apps/users-service/src/migrations/*.ts'],
});
