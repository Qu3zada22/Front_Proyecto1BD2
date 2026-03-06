import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { RestaurantesService } from './restaurantes.service';

@Controller('restaurants')
export class RestaurantesController {
  constructor(private readonly restaurantesService: RestaurantesService) {}

  @Post()
  create(@Body() body: any) {
    return this.restaurantesService.create(body);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.restaurantesService.findAll(query);
  }

  @Get('near')
  findNear(@Query('lng') lng: string, @Query('lat') lat: string, @Query('maxDistance') maxDistance: string) {
    return this.restaurantesService.findNear(+lng, +lat, +maxDistance || 5000);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.restaurantesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantesService.remove(id);
  }
}
