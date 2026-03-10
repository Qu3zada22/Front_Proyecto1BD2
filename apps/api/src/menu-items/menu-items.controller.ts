import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('menu-items')
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Crear varios platillos',
    description: 'Inserta múltiples platillos de un mismo restaurante en una sola operación (create con array).',
  })
  @ApiBody({ schema: { example: [{ restaurante_id: '...', nombre: 'Tacos', precio: 35, categoria: 'principal' }] } })
  createMany(@Body() dtos: CreateMenuItemDto[]) {
    return this.menuItemsService.createMany(dtos);
  }

  @Post()
  @ApiOperation({ summary: 'Crear platillo' })
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuItemsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar platillos',
    description:
      'Filtra por restaurante, categoría, etiqueta o disponibilidad. Por defecto solo devuelve platillos disponibles.',
  })
  @ApiQuery({
    name: 'restaurante_id',
    required: false,
    description: 'ObjectId del restaurante',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    enum: ['entrada', 'principal', 'postre', 'bebida', 'extra'],
  })
  @ApiQuery({
    name: 'etiqueta',
    required: false,
    description: 'Filtrar por etiqueta (índice multikey)',
  })
  @ApiQuery({
    name: 'disponible',
    required: false,
    type: Boolean,
    description:
      'Filtrar por disponibilidad (default: true). Usar false para ver todos.',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('restaurante_id') restauranteId?: string,
    @Query('categoria') categoria?: string,
    @Query('etiqueta') etiqueta?: string,
    @Query('disponible') disponible?: string,
  ) {
    const disponibleBool =
      disponible === undefined ? undefined : disponible === 'true';
    return this.menuItemsService.findAll({
      ...pagination,
      restaurante_id: restauranteId,
      categoria,
      etiqueta,
      disponible: disponibleBool,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener platillo por ID' })
  @ApiParam({ name: 'id', description: 'ObjectId del platillo' })
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar platillo' })
  @ApiParam({ name: 'id', description: 'ObjectId del platillo' })
  update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update(id, dto);
  }

  @Patch('restaurant/:restauranteId/availability')
  @ApiOperation({
    summary: 'Actualizar disponibilidad masiva',
    description:
      'Actualiza disponible en todos los platillos de un restaurante (updateMany).',
  })
  @ApiParam({ name: 'restauranteId', description: 'ObjectId del restaurante' })
  @ApiBody({ schema: { example: { disponible: false } } })
  updateMany(
    @Param('restauranteId', ParseMongoIdPipe) restauranteId: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.updateMany(restauranteId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar platillo' })
  @ApiParam({ name: 'id', description: 'ObjectId del platillo' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.menuItemsService.remove(id);
  }

  @Delete('restaurant/:restauranteId')
  @ApiOperation({
    summary: 'Eliminar todos los platillos de un restaurante',
    description: 'deleteMany por restaurante_id.',
  })
  @ApiParam({ name: 'restauranteId', description: 'ObjectId del restaurante' })
  removeByRestaurant(
    @Param('restauranteId', ParseMongoIdPipe) restauranteId: string,
  ) {
    return this.menuItemsService.removeByRestaurant(restauranteId);
  }

  @Patch(':id/tags')
  @ApiOperation({
    summary: 'Agregar etiqueta',
    description:
      'Usa $addToSet para añadir etiqueta sin duplicados (índice multikey).',
  })
  @ApiParam({ name: 'id', description: 'ObjectId del platillo' })
  @ApiBody({ schema: { example: { tag: 'vegano' } } })
  addTag(@Param('id', ParseMongoIdPipe) id: string, @Body('tag') tag: string) {
    return this.menuItemsService.addTag(id, tag);
  }

  @Delete(':id/tags/:tag')
  @ApiOperation({
    summary: 'Eliminar etiqueta',
    description: 'Usa $pull para remover etiqueta del array.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId del platillo' })
  @ApiParam({ name: 'tag', description: 'Nombre de la etiqueta a eliminar' })
  removeTag(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('tag') tag: string,
  ) {
    return this.menuItemsService.removeTag(id, tag);
  }
}
