import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Orden, OrdenSchema } from './schemas/orden.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema';
import {
  Restaurante,
  RestauranteSchema,
} from '../restaurantes/schemas/restaurante.schema';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Orden.name, schema: OrdenSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Restaurante.name, schema: RestauranteSchema },
    ]),
  ],
  controllers: [OrdenesController],
  providers: [OrdenesService],
  exports: [OrdenesService],
})
export class OrdenesModule {}
