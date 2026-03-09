import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OrdenesService } from './ordenes.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('ordenes')
@Controller('orders')
export class OrdenesController {
    constructor(private readonly ordenesService: OrdenesService) { }

    @Post()
    @ApiOperation({
        summary: 'Crear pedido',
        description: 'Crea una orden dentro de una **transacción ACID** (replica set requerido). El total se calcula automáticamente.',
    })
    create(@Body() dto: CreateOrdenDto) {
        return this.ordenesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar pedidos', description: 'Filtra por cliente, restaurante o estado. Usa índice compuesto.' })
    @ApiQuery({ name: 'cliente_id', required: false, description: 'ObjectId del cliente' })
    @ApiQuery({ name: 'restaurante_id', required: false, description: 'ObjectId del restaurante' })
    @ApiQuery({ name: 'estado', required: false, enum: ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'] })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query() pagination: PaginationDto,
        @Query('cliente_id') clienteId?: string,
        @Query('restaurante_id') restauranteId?: string,
        @Query('estado') estado?: string,
    ) {
        return this.ordenesService.findAll({ cliente_id: clienteId, restaurante_id: restauranteId, estado, ...pagination });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener pedido por ID', description: 'Incluye populate de cliente y restaurante.' })
    @ApiParam({ name: 'id', description: 'ObjectId de la orden' })
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.ordenesService.findOne(id);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Actualizar estado del pedido', description: 'Estados válidos: pendiente → confirmado → en_camino → entregado | cancelado.' })
    @ApiParam({ name: 'id', description: 'ObjectId de la orden' })
    @ApiBody({ schema: { example: { estado: 'confirmado' } } })
    updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body('estado') estado: string) {
        return this.ordenesService.updateStatus(id, estado);
    }

    @Delete('bulk')
    @ApiOperation({ summary: 'Eliminar múltiples pedidos', description: 'deleteMany por array de IDs.' })
    @ApiBody({ schema: { example: { ids: ['64a1b2c3d4e5f6a7b8c9d0e1', '64a1b2c3d4e5f6a7b8c9d0e2'] } } })
    removeMany(@Body('ids') ids: string[]) {
        return this.ordenesService.removeMany(ids);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar pedido' })
    @ApiParam({ name: 'id', description: 'ObjectId de la orden' })
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.ordenesService.remove(id);
    }
}
