import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EstadoOrden =
    | 'pendiente'
    | 'en_proceso'
    | 'en_camino'
    | 'entregado'
    | 'cancelado';

// ---- Embedded: snapshot del ítem al momento de la orden ----
@Schema({ _id: false })
export class ItemOrden {
    @Prop({ type: Types.ObjectId, ref: 'MenuItem' })
    menu_item_id?: Types.ObjectId;

    // item_id: alias usado por el seed (compatibilidad)
    @Prop({ type: Types.ObjectId, ref: 'MenuItem' })
    item_id?: Types.ObjectId;

    @Prop({ required: true }) nombre: string;    // snapshot
    @Prop() precio?: number;                      // campo API
    @Prop() precio_unitario?: number;             // campo seed (Decimal128 convertido)
    @Prop({ required: true, min: 1 }) cantidad: number;
    @Prop() subtotal?: number;                    // precio_unitario × cantidad
    @Prop() notas?: string;
    @Prop() notas_item?: string;                  // alias seed
}
export const ItemOrdenSchema = SchemaFactory.createForClass(ItemOrden);

// ---- Embedded: entrada del historial de estados ----
@Schema({ _id: false })
export class EstadoLog {
    @Prop({ required: true }) estado: string;
    @Prop({ required: true, default: () => new Date() }) timestamp: Date;
    @Prop({ type: Types.ObjectId }) actor_id?: Types.ObjectId;
    @Prop() nota?: string;
}
export const EstadoLogSchema = SchemaFactory.createForClass(EstadoLog);

// ---- Embedded: dirección de entrega (snapshot) ----
@Schema({ _id: false })
export class DireccionEntrega {
    @Prop() alias?: string;
    @Prop({ required: true }) calle: string;
    @Prop({ required: true }) ciudad: string;
    @Prop({ required: true }) pais: string;
}
export const DireccionEntregaSchema = SchemaFactory.createForClass(DireccionEntrega);

// ---- Orden ----
export type OrdenDocument = HydratedDocument<Orden>;

@Schema({ timestamps: false, collection: 'ordenes' })
export class Orden {
    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    usuario_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Restaurante', required: true })
    restaurante_id: Types.ObjectId;

    // Items embebidos con snapshot del precio al momento de la orden
    @Prop({ type: [ItemOrdenSchema], default: [] })
    items: ItemOrden[];

    @Prop({
        type: String,
        enum: ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'],
        default: 'pendiente',
    })
    estado: EstadoOrden;

    // Historial de cambios de estado — $push al cambiar estado
    @Prop({ type: [EstadoLogSchema], default: [] })
    historial_estados: EstadoLog[];

    @Prop({ required: true, min: 0 }) total: number;

    @Prop({ type: DireccionEntregaSchema, required: true })
    direccion_entrega: DireccionEntrega;

    @Prop() notas?: string;

    // DESNORM: evita $lookup a resenas para saber si la orden fue reseñada
    @Prop({ default: false }) tiene_resena: boolean;

    // Fecha explícita para queries y aggregations (Mongoose timestamps da createdAt)
    @Prop({ default: () => new Date() }) fecha_creacion: Date;

    // Seteada cuando estado pasa a 'entregado'
    @Prop() fecha_entrega_real?: Date;
}

export const OrdenSchema = SchemaFactory.createForClass(Orden);

// ---- Índices ----
// Compuesto ESR: historial de pedidos de un cliente filtrado por estado
OrdenSchema.index(
    { usuario_id: 1, estado: 1, fecha_creacion: -1 },
    { name: 'usuario_estado_fecha_esr' },
);
// Compuesto ESR: pedidos de un restaurante por estado
OrdenSchema.index(
    { restaurante_id: 1, estado: 1, fecha_creacion: -1 },
    { name: 'restaurante_estado_fecha_esr' },
);
// Simple: filtro admin global por estado
OrdenSchema.index({ estado: 1 }, { name: 'estado_simple' });
// Compuesto: aggregation ingresosPorDia (estado + rango de fechas sin filtro de usuario/restaurante)
OrdenSchema.index({ estado: 1, fecha_creacion: -1 }, { name: 'idx_ordenes_estado_fecha' });
// Multikey: aggregation platillos más vendidos ($unwind items)
OrdenSchema.index({ 'items.item_id': 1 }, { name: 'items_item_id_multikey' });
// Simple desc: ordenar por fecha de creación
OrdenSchema.index({ fecha_creacion: -1 }, { name: 'fecha_creacion_desc' });
