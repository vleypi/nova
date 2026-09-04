import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import {
  USERS_SERVICE,
  USERS_PACKAGE,
  USERS_PROTO_PATH,
  USERS_SERVICE_URL,
  AUTH_SERVICE,
  AUTH_PACKAGE,
  AUTH_PROTO_PATH,
  AUTH_SERVICE_URL,
  JWT_SECRET,
} from '@app/common';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
    ClientsModule.register([
      {
        name: USERS_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: USERS_PACKAGE,
          protoPath: join(process.cwd(), USERS_PROTO_PATH),
          url: USERS_SERVICE_URL,
        },
      },
      {
        name: AUTH_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: AUTH_PACKAGE,
          protoPath: join(process.cwd(), AUTH_PROTO_PATH),
          url: AUTH_SERVICE_URL,
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [JwtAuthGuard],
})
export class UsersModule {}
