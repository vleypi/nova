import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { BOARDS_PACKAGE, BOARDS_SERVICE_URL } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: BOARDS_PACKAGE,
      protoPath: join(process.cwd(), 'proto/boards.proto'),
      url: BOARDS_SERVICE_URL,
    },
  });

  await app.listen();
  console.log('Boards Microservice running on grpc://localhost:5002');
}
bootstrap();
