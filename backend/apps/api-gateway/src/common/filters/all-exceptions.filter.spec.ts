import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const makeHost = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
};

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('HttpException branch', () => {
    it('passes through string body wrapped in { statusCode, message }', () => {
      const { host, res } = makeHost();
      const exception = new HttpException('Не нашлось', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Не нашлось',
      });
    });

    it('forwards object body as-is', () => {
      const { host, res } = makeHost();
      const body = { statusCode: 422, message: ['email must be valid'], error: 'Unprocessable' };
      const exception = new HttpException(body, 422);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(body);
    });
  });

  describe('gRPC error mapping by message text', () => {
    const cases: Array<[string, number]> = [
      ['Пользователь не найден', HttpStatus.NOT_FOUND],
      ['User not found',         HttpStatus.NOT_FOUND],
      ['Неверный код',           HttpStatus.BAD_REQUEST],
      ['Код истёк',              HttpStatus.BAD_REQUEST],
      ['Invalid code',           HttpStatus.BAD_REQUEST],
      ['Аккаунт заблокирован',   HttpStatus.FORBIDDEN],
      ['Account blocked',        HttpStatus.FORBIDDEN],
      ['Невалидный токен',       HttpStatus.UNAUTHORIZED],
      ['Не авторизован',         HttpStatus.UNAUTHORIZED],
      ['Unauthorized',           HttpStatus.UNAUTHORIZED],
    ];

    it.each(cases)('"%s" → %i', (details, expected) => {
      const { host, res } = makeHost();

      filter.catch({ details }, host);

      expect(res.status).toHaveBeenCalledWith(expected);
      expect(res.json).toHaveBeenCalledWith({ statusCode: expected, message: details });
    });

    it('"unavailable" → 503 with replaced message', () => {
      const { host, res } = makeHost();

      filter.catch({ details: 'service unavailable' }, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Сервис временно недоступен',
      });
    });

    it('"ECONNREFUSED" → 503 with replaced message', () => {
      const { host, res } = makeHost();

      filter.catch({ message: 'ECONNREFUSED 127.0.0.1:50051' }, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Сервис временно недоступен',
      });
    });

    it('unrecognised message → 500 with original text', () => {
      const { host, res } = makeHost();

      filter.catch({ details: 'something exploded' }, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'something exploded',
      });
    });

    it('uses fallback message when exception has no details/message', () => {
      const { host, res } = makeHost();

      filter.catch({}, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('prefers details over message when both are present', () => {
      const { host, res } = makeHost();

      filter.catch({ details: 'Не найдено', message: 'Аккаунт заблокирован' }, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });
});
