import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { Orden, OrdenSchema } from '../ordenes/schemas/orden.schema';
import { Resena, ResenaSchema } from '../resenas/schemas/resena.schema';
import {
  Restaurante,
  RestauranteSchema,
} from '../restaurantes/schemas/restaurante.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Orden.name, schema: OrdenSchema },
      { name: Resena.name, schema: ResenaSchema },
      { name: Restaurante.name, schema: RestauranteSchema },
    ]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
