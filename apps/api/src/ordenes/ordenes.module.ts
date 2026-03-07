import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Orden, OrdenSchema } from './schemas/orden.schema';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Orden.name, schema: OrdenSchema }])],
    controllers: [OrdenesController],
    providers: [OrdenesService],
    exports: [OrdenesService],
})
export class OrdenesModule { }
