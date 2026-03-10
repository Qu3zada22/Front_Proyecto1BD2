import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Orden, OrdenSchema } from '../ordenes/schemas/orden.schema';
import {
  Restaurante,
  RestauranteSchema,
} from '../restaurantes/schemas/restaurante.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';
import { Resena, ResenaSchema } from '../resenas/schemas/resena.schema';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Orden.name, schema: OrdenSchema },
      { name: Restaurante.name, schema: RestauranteSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Resena.name, schema: ResenaSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
