import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { USERS_PACKAGE, USERS_SERVICE_URL } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: USERS_PACKAGE,
      protoPath: join(process.cwd(), 'proto/users.proto'),
      url: USERS_SERVICE_URL,
    },
  });

  await app.listen();
  console.log('Users Microservice running on grpc://localhost:5000');
}
bootstrap();
