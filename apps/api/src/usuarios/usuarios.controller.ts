import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, DireccionUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('users')
export class UsuariosController {
    constructor(private readonly usuariosService: UsuariosService) { }

    @Post()
    create(@Body() dto: CreateUsuarioDto) {
        return this.usuariosService.create(dto);
    }

    @Post('login')
    login(@Body('email') email: string) {
        return this.usuariosService.findByEmail(email);
    }

    @Get(':id')
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.usuariosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateUsuarioDto) {
        return this.usuariosService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.usuariosService.remove(id);
    }

    @Post(':id/addresses')
    addAddress(
        @Param('id', ParseMongoIdPipe) id: string,
        @Body() dto: DireccionUsuarioDto,
    ) {
        return this.usuariosService.addAddress(id, dto);
    }

    @Delete(':id/addresses/:alias')
    removeAddress(
        @Param('id', ParseMongoIdPipe) id: string,
        @Param('alias') alias: string,
    ) {
        return this.usuariosService.removeAddress(id, alias);
    }
}
