import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Orden, OrdenDocument, EstadoOrden } from './schemas/orden.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { CreateOrdenDto } from './dto/create-orden.dto';

const ESTADOS_VALIDOS: EstadoOrden[] = [
    'pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado',
];

@Injectable()
export class OrdenesService {
    constructor(
        @InjectModel(Orden.name) private ordenModel: Model<OrdenDocument>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
        @InjectConnection() private connection: Connection,
    ) { }

    // Transacción ACID: insert orden + bulkWrite $inc veces_ordenado
    async create(dto: CreateOrdenDto): Promise<OrdenDocument> {
        // Mapear items: normalizar campos para consistencia con seed y aggregations
        const itemsMapped = dto.items.map((i) => ({
            item_id: new Types.ObjectId(i.menu_item_id),
            menu_item_id: new Types.ObjectId(i.menu_item_id),
            nombre: i.nombre,
            precio_unitario: i.precio,
            precio: i.precio,
            cantidad: i.cantidad,
            subtotal: i.precio * i.cantidad,
            ...(i.notas && { notas: i.notas }),
        }));

        const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            // Paso 1 (PDF spec): verificar disponible:true en todos los platillos
            // Deduplicar IDs: $in deduplica en MongoDB, el length debe compararse contra únicos
            const uniqueItemIds = [...new Set(itemsMapped.map(i => i.item_id.toHexString()))]
                .map(hex => new Types.ObjectId(hex));
            const disponibles = await this.menuItemModel
                .find({ _id: { $in: uniqueItemIds }, disponible: true }, { _id: 1 }, { session })
                .lean();
            if (disponibles.length !== uniqueItemIds.length) {
                throw new BadRequestException('Uno o más platillos no están disponibles');
            }

            const [orden] = await this.ordenModel.create(
                [{ ...dto, items: itemsMapped, total }] as any[],
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
        if (query.cliente_id) filter.usuario_id = new Types.ObjectId(query.cliente_id);
        if (query.restaurante_id) filter.restaurante_id = new Types.ObjectId(query.restaurante_id);
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
            throw new BadRequestException(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}`);
        }

        const histEntry: any = {
            estado,
            timestamp: new Date(),
            ...(actorId && { actor_id: new Types.ObjectId(actorId) }),
            ...(nota && { nota }),
        };

        const update: any = {
            $set: { estado },
            $push: { historial_estados: histEntry },
        };

        if (estado === 'entregado') {
            update.$set.fecha_entrega_real = new Date();
        }

        const updated = await this.ordenModel
            .findByIdAndUpdate(id, update, { new: true })
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
