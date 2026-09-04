import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { API_GATEWAY_PORT, CLIENT_URL, SWAGGER_PATH } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: CLIENT_URL,
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Nova API')
    .setDescription('REST API Swagger')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      withCredentials: true,
    },
  });

  await app.listen(API_GATEWAY_PORT);
  console.log(`API Gateway on http://localhost:${API_GATEWAY_PORT}`);
  console.log(`Swagger docs on http://localhost:${API_GATEWAY_PORT}/${SWAGGER_PATH}`);
}
bootstrap();
