import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resena, ResenaDocument } from './schemas/resena.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { Orden } from '../ordenes/schemas/orden.schema';

@Injectable()
export class ResenasService {
    constructor(
        @InjectModel(Resena.name) private resenaModel: Model<ResenaDocument>,
        @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
        @InjectModel(Orden.name) private ordenModel: Model<any>,
    ) { }

    async create(data: any): Promise<ResenaDocument> {
        const resena = await this.resenaModel.create(data);

        // Actualizar calificacion_prom y total_resenas del restaurante (campo desnormalizado)
        if (data.restaurante_id) {
            const [stats] = await this.resenaModel.aggregate([
                { $match: { restaurante_id: new Types.ObjectId(data.restaurante_id), activa: true } },
                { $group: { _id: null, avg: { $avg: '$calificacion' }, count: { $sum: 1 } } },
            ]);
            if (stats) {
                await this.restauranteModel.findByIdAndUpdate(data.restaurante_id, {
                    $set: {
                        calificacion_prom: Math.round(stats.avg * 10) / 10,
                        total_resenas: stats.count,
                    },
                });
            }
        }

        // Marcar la orden como reseñada (campo desnormalizado, evita $lookup)
        if (data.orden_id) {
            await this.ordenModel.findByIdAndUpdate(data.orden_id, {
                $set: { tiene_resena: true },
            });
        }

        return resena;
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
            .populate('usuario_id', 'nombre')
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
