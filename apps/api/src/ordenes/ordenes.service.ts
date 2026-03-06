import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Orden, OrdenDocument, EstadoOrden } from './schemas/orden.schema';

@Injectable()
export class OrdenesService {
  constructor(
    @InjectModel(Orden.name) private ordenModel: Model<OrdenDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  // Crea la orden dentro de una transacción MongoDB
  async create(data: Partial<Orden>): Promise<OrdenDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const [orden] = await this.ordenModel.create([data], { session });
      await session.commitTransaction();
      return orden;
    } catch (err) {
      await session.abortTransaction();
      throw new BadRequestException('Error al crear la orden: ' + err.message);
    } finally {
      await session.endSession();
    }
  }

  async findAll(query: {
    cliente_id?: string;
    restaurante_id?: string;
    estado?: string;
    sort?: string;
    skip?: string;
    limit?: string;
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
      .skip(parseInt(query.skip ?? '0'))
      .limit(parseInt(query.limit ?? '20'))
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
    const estadosValidos: EstadoOrden[] = [
      'pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado',
    ];
    if (!estadosValidos.includes(estado as EstadoOrden)) {
      throw new BadRequestException('Estado inválido');
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
}
