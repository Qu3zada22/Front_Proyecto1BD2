import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('orders')
export class OrdenesController {
    constructor(private readonly ordenesService: OrdenesService) { }

    @Post()
    create(@Body() dto: CreateOrdenDto) {
        return this.ordenesService.create(dto);
    }

    @Get()
    findAll(
        @Query() pagination: PaginationDto,
        @Query('cliente_id') clienteId?: string,
        @Query('restaurante_id') restauranteId?: string,
        @Query('estado') estado?: string,
    ) {
        return this.ordenesService.findAll({ cliente_id: clienteId, restaurante_id: restauranteId, estado, ...pagination });
    }

    @Get(':id')
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.ordenesService.findOne(id);
    }

    @Patch(':id/status')
    updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body('estado') estado: string) {
        return this.ordenesService.updateStatus(id, estado);
    }

    // Cancelar múltiples órdenes (delete many)
    @Delete('bulk')
    removeMany(@Body('ids') ids: string[]) {
        return this.ordenesService.removeMany(ids);
    }

    @Delete(':id')
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.ordenesService.remove(id);
    }
}
