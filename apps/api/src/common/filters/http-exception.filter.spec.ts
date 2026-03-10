import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeHost(url = '/api/test') {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const response = { status: mockStatus, json: mockJson } as any;
  const request = { url } as any;

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    mockStatus,
    mockJson,
  };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  // ── HttpException ─────────────────────────────────────────────────────────

  describe('HttpException', () => {
    it('should use the HTTP status and string message from HttpException', () => {
      const { switchToHttp, mockStatus, mockJson } = makeHost('/api/users');
      const host = { switchToHttp } as any;

      filter.catch(
        new HttpException('Recurso no encontrado', HttpStatus.NOT_FOUND),
        host,
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 404,
          message: 'Recurso no encontrado',
          path: '/api/users',
        }),
      );
    });

    it('should extract message from object-shaped HttpException response', () => {
      const { switchToHttp, mockJson } = makeHost();
      const host = { switchToHttp } as any;
      const exception = new HttpException(
        { message: ['campo requerido', 'formato inválido'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      const call = mockJson.mock.calls[0][0];
      expect(call.message).toEqual(['campo requerido', 'formato inválido']);
      expect(call.statusCode).toBe(400);
    });

    it('should include a valid ISO timestamp in the response', () => {
      const { switchToHttp, mockJson } = makeHost();
      const host = { switchToHttp } as any;

      filter.catch(new HttpException('Error', HttpStatus.BAD_REQUEST), host);

      const ts = mockJson.mock.calls[0][0].timestamp;
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });

  // ── MongoDB duplicate key (code 11000) ────────────────────────────────────

  describe('MongoDB duplicate key error (code 11000)', () => {
    it('should return 409 Conflict with generic duplicate message', () => {
      const { switchToHttp, mockStatus, mockJson } = makeHost('/api/users');
      const host = { switchToHttp } as any;
      const mongoError = { code: 11000 };

      filter.catch(mongoError, host);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 409,
          message: 'Ya existe un documento con ese valor único',
        }),
      );
    });
  });

  // ── Mongoose CastError ────────────────────────────────────────────────────

  describe('CastError (invalid ObjectId cast)', () => {
    it('should return 400 Bad Request with cast error message', () => {
      const { switchToHttp, mockStatus, mockJson } = makeHost();
      const host = { switchToHttp } as any;
      const castError = { name: 'CastError' };

      filter.catch(castError, host);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          message: 'ID con formato inválido',
        }),
      );
    });
  });

  // ── Unknown error ─────────────────────────────────────────────────────────

  describe('unknown error', () => {
    it('should return 500 Internal Server Error for unexpected exceptions', () => {
      const { switchToHttp, mockStatus, mockJson } = makeHost('/api/orders');
      const host = { switchToHttp } as any;

      filter.catch(new Error('unexpected crash'), host);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'Error interno del servidor',
          path: '/api/orders',
        }),
      );
    });

    it('should return 500 for null exception', () => {
      const { switchToHttp, mockStatus } = makeHost();
      const host = { switchToHttp } as any;

      filter.catch(null, host);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  // ── path propagation ──────────────────────────────────────────────────────

  describe('path in response', () => {
    it('should echo the request url in the response path field', () => {
      const { switchToHttp, mockJson } = makeHost('/api/menu-items/abc');
      const host = { switchToHttp } as any;

      filter.catch(new Error('boom'), host);

      expect(mockJson.mock.calls[0][0].path).toBe('/api/menu-items/abc');
    });
  });
});
