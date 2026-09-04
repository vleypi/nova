import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '@app/common';

// Адаптер для горизонтального масштабирования socket.io: все broadcast'ы
// (server.emit, server.to('room').emit, client.to('room').emit) транслируются
// между инстансами через Redis Pub/Sub. Без него каждый инстанс работает
// со своими комнатами и клиенты на разных инстансах не получают сообщения
// друг друга.
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    this.pubClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      // Pub/Sub клиенты не должны делать retry со стандартной стратегией —
      // socket.io адаптер сам разруливает реконнекты.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (e) => console.error('[RedisAdapter pub] error:', e.message));
    this.subClient.on('error', (e) => console.error('[RedisAdapter sub] error:', e.message));

    // Ждём ready с таймаутом 5с — если Redis недоступен при старте, не блокируем
    // bootstrap. Сокеты будут работать локально на одном инстансе, а как только
    // Redis станет доступен, ioredis переподключится автоматически.
    await Promise.allSettled([
      this.waitReady(this.pubClient, 'pub'),
      this.waitReady(this.subClient, 'sub'),
    ]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    console.log('[RedisAdapter] adapter initialized');
  }

  private waitReady(client: Redis, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.status === 'ready') return resolve();
      const timer = setTimeout(() => {
        client.off('ready', onReady);
        client.off('error', onError);
        console.warn(`[RedisAdapter ${name}] not ready in 5s; proceeding`);
        resolve();
      }, 5000);
      const onReady = () => {
        clearTimeout(timer);
        client.off('error', onError);
        resolve();
      };
      const onError = (e: Error) => {
        clearTimeout(timer);
        client.off('ready', onReady);
        reject(new Error(`[RedisAdapter ${name}] failed to connect: ${e.message}`));
      };
      client.once('ready', onReady);
      client.once('error', onError);
    });
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
