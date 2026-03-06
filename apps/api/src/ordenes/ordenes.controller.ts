import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';

@Controller('orders')
export class OrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Post()
  create(@Body() body: any) {
    return this.ordenesService.create(body);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.ordenesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordenesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('estado') estado: string) {
    return this.ordenesService.updateStatus(id, estado);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordenesService.remove(id);
  }
}
