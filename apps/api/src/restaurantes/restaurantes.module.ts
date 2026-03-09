import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurante, RestauranteSchema } from './schemas/restaurante.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Orden, OrdenSchema } from '../ordenes/schemas/orden.schema';
import { RestaurantesController } from './restaurantes.controller';
import { RestaurantesService } from './restaurantes.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Restaurante.name, schema: RestauranteSchema },
            { name: MenuItem.name, schema: MenuItemSchema },
            { name: Orden.name, schema: OrdenSchema },
        ]),
    ],
    controllers: [RestaurantesController],
    providers: [RestaurantesService],
    exports: [RestaurantesService],
})
export class RestaurantesModule { }
