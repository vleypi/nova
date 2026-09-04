import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import Redis from 'ioredis';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { CollabAdminController } from './collab-admin.controller';
import {
  JWT_SECRET,
  REDIS_HOST,
  REDIS_PORT,
  BOARDS_SERVICE,
  BOARDS_PACKAGE,
  BOARDS_PROTO_PATH,
  BOARDS_SERVICE_URL,
} from '@app/common';

const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        console.warn(`[Redis] Reconnecting attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    client.on('connect', () => console.log('[Redis] Connected'));
    client.on('ready', () => console.log('[Redis] Ready'));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.on('close', () => console.warn('[Redis] Connection closed'));

    return client;
  },
};

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
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
    ]),
  ],
  controllers: [CollabAdminController],
  providers:   [RedisProvider, CollaborationGateway, CollaborationService],
  exports:     [CollaborationService],
})
export class CollaborationModule {}
