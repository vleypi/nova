import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { AUTH_PACKAGE, AUTH_SERVICE_URL } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE,
      protoPath: join(process.cwd(), 'proto/auth.proto'),
      url: AUTH_SERVICE_URL,
    },
  });

  await app.listen();
  console.log('Auth Microservice running on grpc://localhost:5001');
}
bootstrap();
