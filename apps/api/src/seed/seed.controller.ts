import { Controller, Post, Delete } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  run() {
    return this.seedService.run();
  }

  @Delete()
  clear() {
    return this.seedService.clearAll().then(() => ({ message: 'Base de datos limpiada' }));
  }
}
