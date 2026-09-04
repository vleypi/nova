import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Если это HTTP исключение 
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
    }

    const grpcError = exception as any;
    const rawMessage: string =
      grpcError?.details ||
      grpcError?.message ||
      'Internal server error';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = rawMessage;

    const lower = rawMessage.toLowerCase();

    if (/не найден|not found/i.test(rawMessage)) {
      status = HttpStatus.NOT_FOUND;
    } else if (/неверный код|неверный|истёк|invalid code/i.test(rawMessage)) {
      status = HttpStatus.BAD_REQUEST;
    } else if (/заблокирован|blocked/i.test(rawMessage)) {
      status = HttpStatus.FORBIDDEN;
    } else if (/невалидный|не авторизован|unauthorized/i.test(rawMessage)) {
      status = HttpStatus.UNAUTHORIZED;
    } else if (lower.includes('unavailable') || lower.includes('econnrefused')) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Сервис временно недоступен';
    }

    this.logger.error(
      `Необработанное исключение: ${JSON.stringify({
        code: grpcError?.code,
        details: grpcError?.details,
        message: grpcError?.message,
      })}`,
    );

    response.status(status).json({ statusCode: status, message });
  }
}
