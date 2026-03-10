import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import {
  Restaurante,
  RestauranteSchema,
} from '../restaurantes/schemas/restaurante.schema';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurante.name, schema: RestauranteSchema },
    ]),
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
