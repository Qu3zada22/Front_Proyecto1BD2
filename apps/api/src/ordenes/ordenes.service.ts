import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Orden, OrdenDocument, EstadoOrden } from './schemas/orden.schema';
import { CreateOrdenDto } from './dto/create-orden.dto';

const ESTADOS_VALIDOS: EstadoOrden[] = [
  'pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado',
];

@Injectable()
export class OrdenesService {
  constructor(
    @InjectModel(Orden.name) private ordenModel: Model<OrdenDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  // Transacción MongoDB — requiere replica set
  async create(dto: CreateOrdenDto): Promise<OrdenDocument> {
    const total = dto.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const [orden] = await this.ordenModel.create([{ ...dto, total }] as any[], { session });
      await session.commitTransaction();
      return orden;
    } catch (err) {
      await session.abortTransaction();
      throw new BadRequestException('Error al crear la orden: ' + (err as Error).message);
    } finally {
      await session.endSession();
    }
  }

  async findAll(query: {
    cliente_id?: string;
    restaurante_id?: string;
    estado?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    const filter: any = {};
    if (query.cliente_id) filter.cliente_id = query.cliente_id;
    if (query.restaurante_id) filter.restaurante_id = query.restaurante_id;
    if (query.estado) filter.estado = query.estado;

    return this.ordenModel
      .find(filter)
      .populate('cliente_id', 'nombre email')
      .populate('restaurante_id', 'nombre direccion')
      .sort({ createdAt: -1 })
      .skip(query.skip ?? 0)
      .limit(query.limit ?? 20)
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<any> {
    const orden = await this.ordenModel
      .findById(id)
      .populate('cliente_id', 'nombre email telefono')
      .populate('restaurante_id', 'nombre telefono direccion')
      .lean()
      .exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    return orden;
  }

  async updateStatus(id: string, estado: string): Promise<OrdenDocument> {
    if (!ESTADOS_VALIDOS.includes(estado as EstadoOrden)) {
      throw new BadRequestException(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}`);
    }
    const updated = await this.ordenModel
      .findByIdAndUpdate(id, { $set: { estado } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Orden no encontrada');
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.ordenModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Orden no encontrada');
    return { deleted: true };
  }

  async removeMany(ids: string[]): Promise<{ deleted: number }> {
    const result = await this.ordenModel.deleteMany({ _id: { $in: ids } }).exec();
    return { deleted: result.deletedCount };
  }
}
