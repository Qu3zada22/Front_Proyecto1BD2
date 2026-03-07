import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ResenasService } from './resenas.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('reviews')
export class ResenasController {
  constructor(private readonly resenasService: ResenasService) {}

  @Post()
  create(@Body() dto: CreateResenaDto) {
    return this.resenasService.create(dto);
  }

  @Get('restaurant/:id')
  findByRestaurant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Query('sort') sort: string,
    @Query('skip') skip: string,
    @Query('limit') limit: string,
  ) {
    return this.resenasService.findByRestaurant(id, sort, +skip || 0, +limit || 10);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.resenasService.remove(id);
  }
}
