import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { AuditLog } from './users/entities/audit-log.entity';
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_USERS_DB,
  isProduction,
} from '@app/common';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      username: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_USERS_DB,
      entities: [User, AuditLog],
      synchronize: !isProduction(),
      migrations: ['dist/apps/users-service/migrations/*.js'],
      migrationsRun: isProduction(),
    }),
    UsersModule,
  ],
})
export class AppModule {}
