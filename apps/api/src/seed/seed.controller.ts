import { Controller, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({
    summary: 'Poblar la base de datos',
    description:
      'Ejecuta el script `apps/database/ingest.js` que inserta:\n' +
      '- 15 usuarios (bcrypt)\n' +
      '- 8 restaurantes con imágenes GridFS\n' +
      '- 72 platillos\n' +
      '- **50 000 órdenes** via bulkWrite (batches de 2 000)\n' +
      '- ~6 800 reseñas\n\n' +
      '⚠️ Tarda ~30 segundos. Limpia las colecciones antes de insertar.',
  })
  run() {
    return this.seedService.run();
  }

  @Delete()
  @ApiOperation({
    summary: 'Limpiar la base de datos',
    description: 'Elimina todos los documentos de las 5 colecciones.',
  })
  clear() {
    return this.seedService
      .clearAll()
      .then(() => ({ message: 'Base de datos limpiada' }));
  }
}
