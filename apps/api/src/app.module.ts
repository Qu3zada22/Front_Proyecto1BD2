import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { UsuariosModule } from './usuarios/usuarios.module';
import { RestaurantesModule } from './restaurantes/restaurantes.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { ResenasModule } from './resenas/resenas.module';

@Module({
  imports: [
    // Carga variables de entorno desde .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a MongoDB — URI desde variable de entorno
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    UsuariosModule,
    RestaurantesModule,
    MenuItemsModule,
    OrdenesModule,
    ResenasModule,
  ],
})
export class AppModule {}
