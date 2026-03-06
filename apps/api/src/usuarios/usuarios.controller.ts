import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('users')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() body: any) {
    return this.usuariosService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usuariosService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }

  @Post(':id/addresses')
  addAddress(@Param('id') id: string, @Body() address: any) {
    return this.usuariosService.addAddress(id, address);
  }

  @Delete(':id/addresses/:alias')
  removeAddress(@Param('id') id: string, @Param('alias') alias: string) {
    return this.usuariosService.removeAddress(id, alias);
  }
}
