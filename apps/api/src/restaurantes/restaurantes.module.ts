import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurante, RestauranteSchema } from './schemas/restaurante.schema';
import { RestaurantesController } from './restaurantes.controller';
import { RestaurantesService } from './restaurantes.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Restaurante.name, schema: RestauranteSchema }])],
    controllers: [RestaurantesController],
    providers: [RestaurantesService],
    exports: [RestaurantesService],
})
export class RestaurantesModule { }
