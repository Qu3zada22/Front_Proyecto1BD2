import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Orden, OrdenDocument, EstadoOrden } from './schemas/orden.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { CreateOrdenDto } from './dto/create-orden.dto';

const ESTADOS_VALIDOS: EstadoOrden[] = [
  'pendiente',
  'en_proceso',
  'en_camino',
  'entregado',
  'cancelado',
];

const TRANSICIONES: Record<string, string[]> = {
  pendiente: ['en_proceso', 'cancelado'],
  en_proceso: ['en_camino', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

@Injectable()
export class OrdenesService {
  constructor(
    @InjectModel(Orden.name) private ordenModel: Model<OrdenDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Usuario.name) private usuarioModel: Model<any>,
    @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
    @InjectConnection() private connection: Connection,
  ) {}

  // Transacción ACID: insert orden + bulkWrite $inc veces_ordenado
  async create(dto: CreateOrdenDto): Promise<OrdenDocument> {
    // OBS-01/02: Validar FK — usuario_id debe existir; restaurante_id debe existir y estar activo
    const [userExists, restExists] = await Promise.all([
      this.usuarioModel.countDocuments({ _id: dto.usuario_id }),
      this.restauranteModel.countDocuments({
        _id: dto.restaurante_id,
        activo: true,
      }),
    ]);
    if (!userExists)
      throw new BadRequestException('El usuario referenciado no existe');
    if (!restExists)
      throw new BadRequestException(
        'El restaurante referenciado no existe o está inactivo',
      );

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // Paso 1 (PDF spec): verificar disponible:true y leer precios reales
      const uniqueItemIds = [
        ...new Set(
          dto.items.map((i) =>
            new Types.ObjectId(i.menu_item_id).toHexString(),
          ),
        ),
      ].map((hex) => new Types.ObjectId(hex));
      const dbItems = await this.menuItemModel
        .find(
          {
            _id: { $in: uniqueItemIds },
            disponible: true,
            // OBS-01: validar que todos los items pertenezcan a este restaurante
            restaurante_id: new Types.ObjectId(dto.restaurante_id),
          },
          { _id: 1, nombre: 1, precio: 1 },
          { session },
        )
        .lean();
      if (dbItems.length !== uniqueItemIds.length) {
        throw new BadRequestException(
          'Uno o más platillos no están disponibles o no pertenecen a este restaurante',
        );
      }

      // Paso 2 (PDF spec): recalcular snapshot con precios actuales de BD
      const dbMap = new Map(
        (dbItems as any[]).map((i) => [i._id.toHexString(), i]),
      );
      const itemsMapped = dto.items.map((i) => {
        const dbItem = dbMap.get(
          new Types.ObjectId(i.menu_item_id).toHexString(),
        )!;
        // BUG-01: parseFloat convierte Decimal128 (seed) y number (API) por igual
        // .lean() devuelve Decimal128 objects sin type-casting; aritmética directa da NaN
        const precio = parseFloat(dbItem.precio?.toString() ?? '0');
        return {
          item_id: new Types.ObjectId(i.menu_item_id),
          menu_item_id: new Types.ObjectId(i.menu_item_id),
          nombre: dbItem.nombre,
          precio_unitario: precio,
          precio: precio,
          cantidad: i.cantidad,
          subtotal: precio * i.cantidad,
          ...(i.notas && { notas: i.notas }),
        };
      });
      const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);

      const [orden] = await this.ordenModel.create(
        [
          {
            usuario_id: new Types.ObjectId(dto.usuario_id),
            restaurante_id: new Types.ObjectId(dto.restaurante_id),
            items: itemsMapped,
            total,
            direccion_entrega: dto.direccion_entrega,
            notas: dto.notas,
          },
        ],
        { session },
      );

      // bulkWrite: $inc veces_ordenado en cada menu_item de la orden
      const bulkOps = itemsMapped.map((item) => ({
        updateOne: {
          filter: { _id: item.item_id },
          update: { $inc: { veces_ordenado: item.cantidad } },
        },
      }));
      await this.menuItemModel.bulkWrite(bulkOps as any[], { session } as any);

      await session.commitTransaction();
      return orden;
    } catch (err) {
      await session.abortTransaction();
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Error al crear la orden: ' + (err as Error).message,
      );
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
    if (query.cliente_id) {
      const oid = new Types.ObjectId(query.cliente_id);
      filter.$or = [{ usuario_id: oid }, { usuario_id: query.cliente_id }];
    }
    if (query.restaurante_id)
      filter.restaurante_id = new Types.ObjectId(query.restaurante_id);
    if (query.estado) filter.estado = query.estado;

    return this.ordenModel
      .find(filter)
      .populate('usuario_id', 'nombre email')
      .populate('restaurante_id', 'nombre direccion')
      .sort({ fecha_creacion: -1 })
      .skip(query.skip ?? 0)
      .limit(query.limit ?? 20)
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<any> {
    const orden = await this.ordenModel
      .findById(id)
      .populate('usuario_id', 'nombre email telefono')
      .populate('restaurante_id', 'nombre telefono direccion')
      .lean()
      .exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    return orden;
  }

  // $set estado + $push historial_estados (array embebido)
  async updateStatus(
    id: string,
    estado: string,
    actorId?: string,
    nota?: string,
  ): Promise<OrdenDocument> {
    if (!ESTADOS_VALIDOS.includes(estado as EstadoOrden)) {
      throw new BadRequestException(
        `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}`,
      );
    }

    // Validar transición legal desde el estado actual
    const orden = await this.ordenModel
      .findById(id)
      .select('estado')
      .lean()
      .exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    const permitidos = TRANSICIONES[(orden as any).estado] ?? [];
    if (!permitidos.includes(estado)) {
      throw new BadRequestException(
        `Transición inválida: ${(orden as any).estado} → ${estado}. Permitidos: ${permitidos.join(', ') || 'ninguno (estado terminal)'}`,
      );
    }

    const histEntry: any = {
      estado,
      timestamp: new Date(),
      ...(actorId && { actor_id: new Types.ObjectId(actorId) }),
      ...(nota && { nota }),
    };

    const update: any = {
      $set: { estado },
      // $each + $slice:-5 mantiene el array acotado en máximo 5 transiciones (diseño)
      $push: { historial_estados: { $each: [histEntry], $slice: -5 } },
    };

    if (estado === 'entregado') {
      update.$set.fecha_entrega_real = new Date();
    }

    const updated = await this.ordenModel
      .findOneAndUpdate({ _id: id, estado: (orden as any).estado }, update, {
        new: true,
      })
      .exec();
    if (!updated)
      throw new BadRequestException(
        'Conflicto: el estado de la orden cambió entre lectura y escritura (reintente)',
      );
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const orden = await this.ordenModel
        .findByIdAndDelete(id, { session })
        .exec();
      if (!orden) throw new NotFoundException('Orden no encontrada');

      // Decrementar veces_ordenado en cada menu_item
      const bulkOps = (orden.items || []).map((item: any) => ({
        updateOne: {
          filter: { _id: item.item_id || item.menu_item_id },
          update: { $inc: { veces_ordenado: -(item.cantidad || 0) } },
        },
      }));
      if (bulkOps.length) {
        await this.menuItemModel.bulkWrite(
          bulkOps as any[],
          { session } as any,
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

  async removeMany(ids: string[]): Promise<{ deleted: number }> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const ordenes = await this.ordenModel
        .find({ _id: { $in: ids } })
        .select('items')
        .lean()
        .session(session)
        .exec();

      const result = await this.ordenModel
        .deleteMany({ _id: { $in: ids } })
        .session(session)
        .exec();

      // Decrementar veces_ordenado para todas las órdenes eliminadas
      const bulkOps = ordenes.flatMap((orden: any) =>
        (orden.items || []).map((item: any) => ({
          updateOne: {
            filter: { _id: item.item_id || item.menu_item_id },
            update: { $inc: { veces_ordenado: -(item.cantidad || 0) } },
          },
        })),
      );
      if (bulkOps.length) {
        await this.menuItemModel.bulkWrite(bulkOps, { session } as any);
      }

      await session.commitTransaction();
      return { deleted: result.deletedCount };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
