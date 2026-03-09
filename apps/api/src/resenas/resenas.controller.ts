import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ResenasService } from './resenas.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('resenas')
@Controller('reviews')
export class ResenasController {
    constructor(private readonly resenasService: ResenasService) { }

    @Post()
    @ApiOperation({ summary: 'Crear reseña' })
    create(@Body() dto: CreateResenaDto) {
        return this.resenasService.create(dto);
    }

    @Get('restaurant/:id')
    @ApiOperation({ summary: 'Reseñas de un restaurante', description: 'Usa índice compuesto restaurante_id + calificacion.' })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    @ApiQuery({ name: 'sort', required: false, enum: ['calificacion', 'fecha'], description: 'Ordenar por calificación (desc) o fecha (desc)' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findByRestaurant(
        @Param('id', ParseMongoIdPipe) id: string,
        @Query('sort') sort: string,
        @Query('skip') skip: string,
        @Query('limit') limit: string,
    ) {
        return this.resenasService.findByRestaurant(id, sort, +skip || 0, +limit || 10);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar reseña' })
    @ApiParam({ name: 'id', description: 'ObjectId de la reseña' })
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.resenasService.remove(id);
    }
}
