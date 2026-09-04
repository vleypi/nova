import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import Redis from 'ioredis';
import {
  USERS_SERVICE,
  USERS_PACKAGE,
  USERS_PROTO_PATH,
  USERS_SERVICE_URL,
  JWT_SECRET,
  JWT_ACCESS_EXPIRES,
  REDIS_HOST,
  REDIS_PORT,
} from '@app/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailService } from './mail.service';

const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () =>
    new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
    }),
};

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_ACCESS_EXPIRES },
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
    ]),
  ],
  controllers: [AuthController],
  providers: [RedisProvider, AuthService, MailService],
})
export class AuthModule {}
