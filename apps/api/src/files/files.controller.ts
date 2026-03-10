import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('archivos')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Subir archivo a GridFS',
    description:
      'Sube un archivo y lo almacena en MongoDB GridFS. Devuelve el fileId.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.upload(file);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar archivos en GridFS',
    description: 'Devuelve metadatos de todos los archivos almacenados.',
  })
  listFiles() {
    return this.filesService.listFiles();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Descargar archivo de GridFS',
    description: 'Hace stream del archivo desde GridFS hacia el cliente.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId del archivo en GridFS' })
  async getFile(
    @Param('id', ParseMongoIdPipe) id: string,
    @Res() res: Response,
  ) {
    return this.filesService.getFile(id, res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar archivo de GridFS' })
  @ApiParam({ name: 'id', description: 'ObjectId del archivo en GridFS' })
  deleteFile(@Param('id', ParseMongoIdPipe) id: string) {
    return this.filesService.deleteFile(id);
  }
}
