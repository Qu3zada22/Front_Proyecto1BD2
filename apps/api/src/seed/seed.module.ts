import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema';
import { Restaurante, RestauranteSchema } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Orden, OrdenSchema } from '../ordenes/schemas/orden.schema';
import { Resena, ResenaSchema } from '../resenas/schemas/resena.schema';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Usuario.name, schema: UsuarioSchema },
            { name: Restaurante.name, schema: RestauranteSchema },
            { name: MenuItem.name, schema: MenuItemSchema },
            { name: Orden.name, schema: OrdenSchema },
            { name: Resena.name, schema: ResenaSchema },
        ]),
    ],
    controllers: [SeedController],
    providers: [SeedService],
})
export class SeedModule { }
