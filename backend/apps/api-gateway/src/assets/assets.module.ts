import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import {
  BOARDS_SERVICE,
  BOARDS_PACKAGE,
  BOARDS_PROTO_PATH,
  BOARDS_SERVICE_URL,
  AUTH_SERVICE,
  AUTH_PACKAGE,
  AUTH_PROTO_PATH,
  AUTH_SERVICE_URL,
  JWT_SECRET,
} from '@app/common';
import { AssetsController } from './assets.controller';
import { gatewayMinioProvider } from './minio.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: JWT_SECRET }),
    ClientsModule.register([
      {
        name: BOARDS_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: BOARDS_PACKAGE,
          protoPath: join(process.cwd(), BOARDS_PROTO_PATH),
          url: BOARDS_SERVICE_URL,
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
  controllers: [AssetsController],
  providers: [gatewayMinioProvider, JwtAuthGuard],
})
export class AssetsModule {}
