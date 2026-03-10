import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Resena, ResenaDocument } from './schemas/resena.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { Orden } from '../ordenes/schemas/orden.schema';

@Injectable()
export class ResenasService {
  constructor(
    @InjectModel(Resena.name) private resenaModel: Model<ResenaDocument>,
    @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
    @InjectModel(Orden.name) private ordenModel: Model<any>,
    @InjectConnection() private connection: Connection,
  ) {}

  // Transacción ACID: insert reseña + actualizar campos desnormalizados
  async create(data: any): Promise<ResenaDocument> {
    // Validar FK: restaurante_id debe existir si se proporciona
    if (data.restaurante_id) {
      const restExists = await this.restauranteModel.countDocuments({
        _id: data.restaurante_id,
      });
      if (!restExists)
        throw new BadRequestException('El restaurante referenciado no existe');
    }
    // Validar FK: orden_id debe existir si se proporciona
    if (data.orden_id) {
      const ordenExists = await this.ordenModel.countDocuments({
        _id: data.orden_id,
      });
      if (!ordenExists)
        throw new BadRequestException('La orden referenciada no existe');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const [resena] = await this.resenaModel.create([data], { session });

      // Actualizar calificacion_prom y total_resenas del restaurante (campo desnormalizado)
      if (data.restaurante_id) {
        const [stats] = await this.resenaModel
          .aggregate([
            {
              $match: {
                restaurante_id: new Types.ObjectId(data.restaurante_id),
                activa: true,
              },
            },
            {
              $group: {
                _id: null,
                avg: { $avg: '$calificacion' },
                count: { $sum: 1 },
              },
            },
          ])
          .session(session);
        if (stats) {
          await this.restauranteModel.findByIdAndUpdate(
            data.restaurante_id,
            {
              $set: {
                calificacion_prom: Math.round(stats.avg * 10) / 10,
                total_resenas: stats.count,
              },
            },
            { session },
          );
        }
      }

      // Marcar la orden como reseñada (campo desnormalizado, evita $lookup)
      if (data.orden_id) {
        await this.ordenModel.findByIdAndUpdate(
          data.orden_id,
          {
            $set: { tiene_resena: true },
          },
          { session },
        );
      }

      await session.commitTransaction();
      return resena;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
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
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const resena = await this.resenaModel
        .findByIdAndDelete(id, { session })
        .exec();
      if (!resena) throw new NotFoundException('Reseña no encontrada');

      // Recalcular calificacion_prom y total_resenas del restaurante
      if (resena.restaurante_id) {
        const [stats] = await this.resenaModel
          .aggregate([
            { $match: { restaurante_id: resena.restaurante_id, activa: true } },
            {
              $group: {
                _id: null,
                avg: { $avg: '$calificacion' },
                count: { $sum: 1 },
              },
            },
          ])
          .session(session);
        await this.restauranteModel.findByIdAndUpdate(
          resena.restaurante_id,
          {
            $set: {
              calificacion_prom: stats ? Math.round(stats.avg * 10) / 10 : 0,
              total_resenas: stats?.count ?? 0,
            },
          },
          { session },
        );
      }

      // Resetear tiene_resena en la orden
      if (resena.orden_id) {
        await this.ordenModel.findByIdAndUpdate(
          resena.orden_id,
          {
            $set: { tiene_resena: false },
          },
          { session },
        );
      }

      await session.commitTransaction();
      return { deleted: true };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
