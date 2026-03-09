import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import type { Response } from 'express';

@Injectable()
export class FilesService implements OnModuleInit {
    private bucket: GridFSBucket;

    constructor(@InjectConnection() private connection: Connection) { }

    onModuleInit() {
        this.bucket = new GridFSBucket(this.connection.db as any, {
            bucketName: 'media',
        });
    }

    async upload(file: Express.Multer.File): Promise<{ id: string; filename: string }> {
        const readable = Readable.from(file.buffer);
        const uploadStream = this.bucket.openUploadStream(file.originalname, {
            metadata: { contentType: file.mimetype, uploadedAt: new Date() },
        });

        readable.pipe(uploadStream);

        return new Promise((resolve, reject) => {
            uploadStream.on('finish', () =>
                resolve({ id: uploadStream.id.toString(), filename: file.originalname }),
            );
            uploadStream.on('error', reject);
        });
    }

    async getFile(id: string, res: Response): Promise<void> {
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            throw new NotFoundException('ID de archivo inválido');
        }

        const files = await this.bucket.find({ _id: objectId }).toArray();
        if (!files.length) throw new NotFoundException('Archivo no encontrado');

        const file = files[0];
        const contentType = (file.metadata?.contentType as string) || this.mimeFromFilename(file.filename);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

        this.bucket.openDownloadStream(objectId).pipe(res);
    }

    async deleteFile(id: string): Promise<{ deleted: boolean }> {
        try {
            await this.bucket.delete(new ObjectId(id));
            return { deleted: true };
        } catch {
            throw new NotFoundException('Archivo no encontrado');
        }
    }

    async listFiles(): Promise<any[]> {
        return this.bucket.find({}).sort({ uploadDate: -1 }).limit(50).toArray();
    }

    private mimeFromFilename(filename: string): string {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const map: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
            pdf: 'application/pdf',
        };
        return map[ext ?? ''] ?? 'application/octet-stream';
    }
}
