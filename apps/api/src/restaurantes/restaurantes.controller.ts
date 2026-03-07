import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { RestaurantesService } from './restaurantes.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';
import { QueryRestaurantesDto } from './dto/query-restaurantes.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('restaurants')
export class RestaurantesController {
  constructor(private readonly restaurantesService: RestaurantesService) {}

  @Post()
  create(@Body() dto: CreateRestauranteDto) {
    return this.restaurantesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryRestaurantesDto) {
    return this.restaurantesService.findAll(query);
  }

  @Get('near')
  findNear(
    @Query('lng') lng: string,
    @Query('lat') lat: string,
    @Query('maxDistance') maxDistance: string,
  ) {
    return this.restaurantesService.findNear(+lng, +lat, +maxDistance || 5000);
  }

  @Get(':id')
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.restaurantesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateRestauranteDto) {
    return this.restaurantesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.restaurantesService.remove(id);
  }
}
