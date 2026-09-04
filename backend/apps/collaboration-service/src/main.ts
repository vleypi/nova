import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CLIENT_URL, COLLAB_SERVICE_PORT } from '@app/common';
import { RedisIoAdapter } from './redis-io-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: CLIENT_URL,
    credentials: true,
  });

  // Подключаем socket.io Redis adapter для горизонтального масштабирования.
  // Должен быть выставлен ДО app.listen(): после listen WebSocket-сервер уже
  // создан с дефолтным in-memory адаптером и заменить его нельзя.
  const wsAdapter = new RedisIoAdapter(app);
  await wsAdapter.connectToRedis();
  app.useWebSocketAdapter(wsAdapter);

  const port = COLLAB_SERVICE_PORT;
  await app.listen(port);
  console.log(`Collaboration Service running on http://localhost:${port}`);
  console.log(`WebSocket available on ws://localhost:${port}`);
}
bootstrap();
