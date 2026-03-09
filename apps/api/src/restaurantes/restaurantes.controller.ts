import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RestaurantesService } from './restaurantes.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';
import { QueryRestaurantesDto } from './dto/query-restaurantes.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('restaurantes')
@Controller('restaurants')
export class RestaurantesController {
    constructor(private readonly restaurantesService: RestaurantesService) { }

    @Post()
    @ApiOperation({ summary: 'Crear restaurante' })
    create(@Body() dto: CreateRestauranteDto) {
        return this.restaurantesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar restaurantes', description: 'Filtra por categoría, búsqueda de texto o estado activo.' })
    @ApiQuery({ name: 'categoria', required: false })
    @ApiQuery({ name: 'busqueda', required: false, description: 'Búsqueda full-text (usa índice text)' })
    @ApiQuery({ name: 'activo', required: false, type: Boolean })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(@Query() query: QueryRestaurantesDto) {
        return this.restaurantesService.findAll(query);
    }

    @Get('near')
    @ApiOperation({ summary: 'Restaurantes cercanos', description: 'Usa índice 2dsphere ($near) para búsqueda geoespacial.' })
    @ApiQuery({ name: 'lng', required: true, type: Number, example: -90.5064 })
    @ApiQuery({ name: 'lat', required: true, type: Number, example: 14.6048 })
    @ApiQuery({ name: 'maxDistance', required: false, type: Number, description: 'Distancia en metros (default 5000)' })
    findNear(
        @Query('lng') lng: string,
        @Query('lat') lat: string,
        @Query('maxDistance') maxDistance: string,
    ) {
        return this.restaurantesService.findNear(+lng, +lat, +maxDistance || 5000);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener restaurante por ID' })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.restaurantesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar restaurante' })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateRestauranteDto) {
        return this.restaurantesService.update(id, dto);
    }

    @Patch(':id/cancel')
    @ApiOperation({
        summary: 'Cancelar restaurante (ACID)',
        description: 'Transacción ACID: marca restaurante activo=false, platillos disponible=false y cancela todas las órdenes activas del restaurante.',
    })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    cancelar(@Param('id', ParseMongoIdPipe) id: string) {
        return this.restaurantesService.cancelarRestaurante(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar restaurante' })
    @ApiParam({ name: 'id', description: 'ObjectId del restaurante' })
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.restaurantesService.remove(id);
    }
}
