import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurante, RestauranteDocument } from './schemas/restaurante.schema';

@Injectable()
export class RestaurantesService {
    constructor(
        @InjectModel(Restaurante.name) private restauranteModel: Model<RestauranteDocument>,
    ) { }

    async create(data: any): Promise<RestauranteDocument> {
        return this.restauranteModel.create(data);
    }

    async findAll(query: {
        categoria?: string;
        busqueda?: string;
        activo?: boolean | string;
        sort?: string;
        skip?: number;
        limit?: number;
    }): Promise<RestauranteDocument[]> {
        const filter: any = {};

        if (query.activo !== undefined) {
            filter.activo = query.activo === 'true' || query.activo === true;
        }
        if (query.categoria) filter.categorias = query.categoria;
        if (query.busqueda) filter.$text = { $search: query.busqueda };

        const sort: any = query.sort ? { [query.sort]: 1 } : { nombre: 1 };
        const skip = Number(query.skip ?? 0);
        const limit = Number(query.limit ?? 20);

        return this.restauranteModel
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-horario')
            .lean()
            .exec() as Promise<RestauranteDocument[]>;
    }

    // Búsqueda geoespacial por proximidad — usa índice 2dsphere
    async findNear(lng: number, lat: number, maxDistance: number): Promise<RestauranteDocument[]> {
        return this.restauranteModel
            .find({
                ubicacion: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: maxDistance,
                    },
                },
                activo: true,
            })
            .limit(20)
            .exec();
    }

    async findOne(id: string): Promise<any> {
        const restaurante = await this.restauranteModel.findById(id).lean().exec();
        if (!restaurante) throw new NotFoundException('Restaurante no encontrado');
        return restaurante;
    }

    async update(id: string, data: any): Promise<RestauranteDocument> {
        const updated = await this.restauranteModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .exec();
        if (!updated) throw new NotFoundException('Restaurante no encontrado');
        return updated;
    }

    async remove(id: string): Promise<{ deleted: boolean }> {
        const result = await this.restauranteModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('Restaurante no encontrado');
        return { deleted: true };
    }
}
