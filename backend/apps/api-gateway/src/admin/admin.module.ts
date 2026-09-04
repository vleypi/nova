import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import {
  BOARDS_SERVICE, BOARDS_PACKAGE, BOARDS_PROTO_PATH, BOARDS_SERVICE_URL,
  USERS_SERVICE,  USERS_PACKAGE,  USERS_PROTO_PATH,  USERS_SERVICE_URL,
  AUTH_SERVICE,   AUTH_PACKAGE,   AUTH_PROTO_PATH,   AUTH_SERVICE_URL,
  JWT_SECRET,
} from '@app/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminUsersController }     from './controllers/admin-users.controller';
import { AdminBoardsController }    from './controllers/admin-boards.controller';
import { AdminSpacesController }    from './controllers/admin-spaces.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminAuditController }     from './controllers/admin-audit.controller';
import { AdminSystemController }    from './controllers/admin-system.controller';
import { AdminRealtimeController }  from './controllers/admin-realtime.controller';

@Module({
  imports: [
    JwtModule.register({ secret: JWT_SECRET }),
    ClientsModule.register([
      {
        name: USERS_SERVICE,
        transport: Transport.GRPC,
        options: { package: USERS_PACKAGE, protoPath: join(process.cwd(), USERS_PROTO_PATH), url: USERS_SERVICE_URL },
      },
      {
        name: BOARDS_SERVICE,
        transport: Transport.GRPC,
        options: { package: BOARDS_PACKAGE, protoPath: join(process.cwd(), BOARDS_PROTO_PATH), url: BOARDS_SERVICE_URL },
      },
      {
        name: AUTH_SERVICE,
        transport: Transport.GRPC,
        options: { package: AUTH_PACKAGE, protoPath: join(process.cwd(), AUTH_PROTO_PATH), url: AUTH_SERVICE_URL },
      },
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminBoardsController,
    AdminSpacesController,
    AdminAnalyticsController,
    AdminAuditController,
    AdminSystemController,
    AdminRealtimeController,
  ],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
