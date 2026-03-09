import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resena, ResenaDocument } from './schemas/resena.schema';

@Injectable()
export class ResenasService {
    constructor(@InjectModel(Resena.name) private resenaModel: Model<ResenaDocument>) { }

    async create(data: any): Promise<ResenaDocument> {
        return this.resenaModel.create(data);
    }

    async findByRestaurant(
        restauranteId: string,
        sort = 'calificacion',
        skip = 0,
        limit = 10,
    ): Promise<any[]> {
        const sortField: Record<string, 1 | -1> =
            sort === 'fecha' ? { fecha: -1 } : { calificacion: -1 };
        return this.resenaModel
            .find({ restaurante_id: new Types.ObjectId(restauranteId), activa: true })
            .populate('cliente_id', 'nombre')
            .sort(sortField)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();
    }

    // $addToSet — agrega like sin duplicados
    async addLike(id: string, userId: string): Promise<ResenaDocument> {
        const updated = await this.resenaModel
            .findByIdAndUpdate(
                id,
                { $addToSet: { likes: new Types.ObjectId(userId) } },
                { new: true },
            )
            .exec();
        if (!updated) throw new NotFoundException('Reseña no encontrada');
        return updated;
    }

    // $pull — quita like del array
    async removeLike(id: string, userId: string): Promise<ResenaDocument> {
        const updated = await this.resenaModel
            .findByIdAndUpdate(
                id,
                { $pull: { likes: new Types.ObjectId(userId) } },
                { new: true },
            )
            .exec();
        if (!updated) throw new NotFoundException('Reseña no encontrada');
        return updated;
    }

    async remove(id: string): Promise<{ deleted: boolean }> {
        const result = await this.resenaModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('Reseña no encontrada');
        return { deleted: true };
    }
}
