import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  create(@Body() body: any) {
    return this.menuItemsService.create(body);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.menuItemsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.menuItemsService.update(id, body);
  }

  @Patch()
  updateMany(@Query('restaurante_id') restauranteId: string, @Body() body: any) {
    return this.menuItemsService.updateMany(restauranteId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }

  @Patch(':id/tags')
  addTag(@Param('id') id: string, @Body('tag') tag: string) {
    return this.menuItemsService.addTag(id, tag);
  }
}
