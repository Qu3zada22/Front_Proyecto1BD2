import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('menu-items')
export class MenuItemsController {
    constructor(private readonly menuItemsService: MenuItemsService) { }

    @Post()
    create(@Body() dto: CreateMenuItemDto) {
        return this.menuItemsService.create(dto);
    }

    @Get()
    findAll(
        @Query() pagination: PaginationDto,
        @Query('restaurante_id') restauranteId?: string,
        @Query('categoria') categoria?: string,
        @Query('etiqueta') etiqueta?: string,
    ) {
        return this.menuItemsService.findAll({ ...pagination, restaurante_id: restauranteId, categoria, etiqueta });
    }

    @Get(':id')
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.menuItemsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateMenuItemDto) {
        return this.menuItemsService.update(id, dto);
    }

    // Actualizar disponibilidad de todos los items de un restaurante
    @Patch('restaurant/:restauranteId/availability')
    updateMany(
        @Param('restauranteId', ParseMongoIdPipe) restauranteId: string,
        @Body() dto: UpdateMenuItemDto,
    ) {
        return this.menuItemsService.updateMany(restauranteId, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.menuItemsService.remove(id);
    }

    // Eliminar todos los items de un restaurante
    @Delete('restaurant/:restauranteId')
    removeByRestaurant(@Param('restauranteId', ParseMongoIdPipe) restauranteId: string) {
        return this.menuItemsService.removeByRestaurant(restauranteId);
    }

    @Patch(':id/tags')
    addTag(@Param('id', ParseMongoIdPipe) id: string, @Body('tag') tag: string) {
        return this.menuItemsService.addTag(id, tag);
    }

    @Delete(':id/tags/:tag')
    removeTag(@Param('id', ParseMongoIdPipe) id: string, @Param('tag') tag: string) {
        return this.menuItemsService.removeTag(id, tag);
    }
}
