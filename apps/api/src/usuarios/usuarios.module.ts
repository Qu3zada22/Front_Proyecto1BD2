import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }])],
    controllers: [UsuariosController],
    providers: [UsuariosService],
    exports: [UsuariosService],
})
export class UsuariosModule { }
