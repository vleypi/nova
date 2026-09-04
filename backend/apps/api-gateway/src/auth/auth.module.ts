import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import {
  AUTH_SERVICE,
  AUTH_PACKAGE,
  AUTH_PROTO_PATH,
  AUTH_SERVICE_URL,
  USERS_SERVICE,
  USERS_PROTO_PATH,
  USERS_SERVICE_URL,
  JWT_SECRET,
} from '@app/common';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: AUTH_PACKAGE,
          protoPath: join(process.cwd(), AUTH_PROTO_PATH),
          url: AUTH_SERVICE_URL,
        },
      },
      {
        name: USERS_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: 'users',
          protoPath: join(process.cwd(), USERS_PROTO_PATH),
          url: USERS_SERVICE_URL,
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard, ClientsModule, JwtModule],
})
export class AuthModule {}
