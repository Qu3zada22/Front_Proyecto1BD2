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
import { FilesService } from './files.service';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    upload(@UploadedFile() file: Express.Multer.File) {
        return this.filesService.upload(file);
    }

    @Get()
    listFiles() {
        return this.filesService.listFiles();
    }

    @Get(':id')
    async getFile(@Param('id', ParseMongoIdPipe) id: string, @Res() res: Response) {
        return this.filesService.getFile(id, res);
    }

    @Delete(':id')
    deleteFile(@Param('id', ParseMongoIdPipe) id: string) {
        return this.filesService.deleteFile(id);
    }
}
