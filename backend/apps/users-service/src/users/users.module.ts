import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { UsersService } from './users.service';
import { AuditLogService } from './audit-log.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService, AuditLogService],
})
export class UsersModule {}
