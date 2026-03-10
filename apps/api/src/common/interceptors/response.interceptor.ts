import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/** Convierte recursivamente Decimal128 → number (documentos .lean() o hidratados) */
function normalizeDecimals(val: any): any {
  if (val === null || val === undefined) return val;
  // BSON Decimal128 nativo: _bsontype='Decimal128'
  if (typeof val === 'object' && val._bsontype === 'Decimal128') {
    return parseFloat(val.toString());
  }
  // JSON serializado: { $numberDecimal: '...' }
  if (typeof val === 'object' && typeof val.$numberDecimal === 'string') {
    return parseFloat(val.$numberDecimal);
  }
  // Documento Mongoose hidratado: convertir a POJO primero
  if (
    typeof val === 'object' &&
    typeof val.toJSON === 'function' &&
    !(val instanceof Date)
  ) {
    return normalizeDecimals(val.toJSON());
  }
  if (Array.isArray(val)) return val.map(normalizeDecimals);
  if (typeof val === 'object' && !(val instanceof Date)) {
    const out: any = {};
    for (const k of Object.keys(val)) out[k] = normalizeDecimals(val[k]);
    return out;
  }
  return val;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: normalizeDecimals(data),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
