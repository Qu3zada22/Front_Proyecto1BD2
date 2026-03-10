import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Restaurante, RestauranteDocument } from './schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Usuario } from '../usuarios/schemas/usuario.schema';

@Injectable()
export class RestaurantesService {
  constructor(
    @InjectModel(Restaurante.name)
    private restauranteModel: Model<RestauranteDocument>,

    @InjectModel(MenuItem.name)
    private menuItemModel: Model<any>,

    @InjectModel(Orden.name)
    private ordenModel: Model<any>,

    @InjectModel(Usuario.name)
    private usuarioModel: Model<any>,

    @InjectConnection()
    private connection: Connection,
  ) {}

  async create(data: any): Promise<RestauranteDocument> {
    if (data.propietario_id) {
      const ownerExists = await this.usuarioModel.countDocuments({
        _id: data.propietario_id,
      });
      if (!ownerExists)
        throw new BadRequestException('El propietario referenciado no existe');
    }
    const doc = { ...data };
    if (doc.img_portada_id)
      doc.img_portada_id = new Types.ObjectId(doc.img_portada_id);
    return this.restauranteModel.create(doc);
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
      .lean()
      .exec() as Promise<RestauranteDocument[]>;
  }

  // Búsqueda geoespacial por proximidad — usa índice 2dsphere
  async findNear(
    lng: number,
    lat: number,
    maxDistance: number,
  ): Promise<RestauranteDocument[]> {
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
    const patch = { ...data };
    if (patch.img_portada_id)
      patch.img_portada_id = new Types.ObjectId(patch.img_portada_id);
    const updated = await this.restauranteModel
      .findByIdAndUpdate(id, { $set: patch }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Restaurante no encontrado');
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const [ordenesCount, menuItemsCount] = await Promise.all([
      this.ordenModel.countDocuments({ restaurante_id: id }),
      this.menuItemModel.countDocuments({ restaurante_id: id }),
    ]);
    if (ordenesCount > 0 || menuItemsCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el restaurante tiene datos asociados. Usa PATCH :id/cancel en su lugar.',
      );
    }
    const result = await this.restauranteModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Restaurante no encontrado');
    return { deleted: true };
  }

  // Transacción ACID: cancelar restaurante + platillos + órdenes activas
  async cancelarRestaurante(
    id: string,
  ): Promise<{ cancelado: boolean; restaurante_id: string }> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const restaurante = await this.restauranteModel
        .findByIdAndUpdate(
          id,
          { $set: { activo: false } },
          { new: true, session },
        )
        .exec();
      if (!restaurante)
        throw new NotFoundException('Restaurante no encontrado');

      await this.menuItemModel.updateMany(
        { restaurante_id: restaurante._id },
        { $set: { disponible: false } },
        { session },
      );

      const histEntry = {
        estado: 'cancelado',
        timestamp: new Date(),
        nota: 'Restaurante cancelado',
      };
      await this.ordenModel.updateMany(
        {
          restaurante_id: restaurante._id,
          // Solo pendiente/en_proceso — en_camino ya está en tránsito (diseño)
          estado: { $in: ['pendiente', 'en_proceso'] },
        },
        {
          $set: { estado: 'cancelado' },
          $push: { historial_estados: { $each: [histEntry], $slice: -5 } },
        },
        { session },
      );

      await session.commitTransaction();
      return { cancelado: true, restaurante_id: id };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
