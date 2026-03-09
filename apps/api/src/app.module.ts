import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { UsuariosModule } from './usuarios/usuarios.module';
import { RestaurantesModule } from './restaurantes/restaurantes.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { ResenasModule } from './resenas/resenas.module';
import { ReportesModule } from './reportes/reportes.module';
import { FilesModule } from './files/files.module';
import { SeedModule } from './seed/seed.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', 'apps/api/.env'],
        }),

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
        ReportesModule,
        FilesModule,
        SeedModule,
    ],
})
export class AppModule { }
