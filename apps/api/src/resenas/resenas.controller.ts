import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ResenasService } from './resenas.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('resenas')
@Controller('reviews')
export class ResenasController {
    constructor(private readonly resenasService: ResenasService) { }

    @Post()
    @ApiOperation({ summary: 'Crear reseña', description: 'Crea una reseña vinculada a restaurante y/o orden.' })
    create(@Body() dto: CreateResenaDto) {
        return this.resenasService.create(dto);
    }

    @Get('restaurant/:id')
    @ApiOperation({ summary: 'Reseñas de un restaurante', description: 'Filtra activa:true. Usa índice restaurante_id + calificacion.' })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    @ApiQuery({ name: 'sort', required: false, enum: ['calificacion', 'fecha'] })
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

    // $addToSet — agrega like sin duplicados
    @Patch(':id/likes/:userId')
    @ApiOperation({ summary: 'Dar like a reseña', description: 'Usa $addToSet para evitar duplicados en el array likes.' })
    @ApiParam({ name: 'id', description: 'ObjectId de la reseña' })
    @ApiParam({ name: 'userId', description: 'ObjectId del usuario que da like' })
    addLike(
        @Param('id', ParseMongoIdPipe) id: string,
        @Param('userId', ParseMongoIdPipe) userId: string,
    ) {
        return this.resenasService.addLike(id, userId);
    }

    // $pull — quita like del array
    @Delete(':id/likes/:userId')
    @ApiOperation({ summary: 'Quitar like de reseña', description: 'Usa $pull para remover el userId del array likes.' })
    @ApiParam({ name: 'id', description: 'ObjectId de la reseña' })
    @ApiParam({ name: 'userId', description: 'ObjectId del usuario' })
    removeLike(
        @Param('id', ParseMongoIdPipe) id: string,
        @Param('userId', ParseMongoIdPipe) userId: string,
    ) {
        return this.resenasService.removeLike(id, userId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar reseña' })
    @ApiParam({ name: 'id', description: 'ObjectId de la reseña' })
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.resenasService.remove(id);
    }
}
