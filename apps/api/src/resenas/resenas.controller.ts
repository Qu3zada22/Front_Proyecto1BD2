import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ResenasService } from './resenas.service';

@Controller('reviews')
export class ResenasController {
  constructor(private readonly resenasService: ResenasService) {}

  @Post()
  create(@Body() body: any) {
    return this.resenasService.create(body);
  }

  @Get('restaurant/:id')
  findByRestaurant(
    @Param('id') id: string,
    @Query('sort') sort: string,
    @Query('skip') skip: string,
    @Query('limit') limit: string,
  ) {
    return this.resenasService.findByRestaurant(id, sort, +skip || 0, +limit || 10);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resenasService.remove(id);
  }
}
