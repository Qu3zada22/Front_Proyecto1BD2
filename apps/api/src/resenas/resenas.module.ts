import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resena, ResenaSchema } from './schemas/resena.schema';
import { Restaurante, RestauranteSchema } from '../restaurantes/schemas/restaurante.schema';
import { Orden, OrdenSchema } from '../ordenes/schemas/orden.schema';
import { ResenasController } from './resenas.controller';
import { ResenasService } from './resenas.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Resena.name, schema: ResenaSchema },
            { name: Restaurante.name, schema: RestauranteSchema },
            { name: Orden.name, schema: OrdenSchema },
        ]),
    ],
    controllers: [ResenasController],
    providers: [ResenasService],
    exports: [ResenasService],
})
export class ResenasModule { }
