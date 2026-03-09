import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EstadoOrden =
    | 'pendiente'
    | 'confirmado'
    | 'en_camino'
    | 'entregado'
    | 'cancelado';

// ---- Embedded: snapshot del ítem al momento de la orden ----
@Schema({ _id: false })
export class ItemOrden {
    @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
    menu_item_id: Types.ObjectId;

    @Prop({ required: true }) nombre: string;    // snapshot
    @Prop({ required: true }) precio: number;    // snapshot del precio
    @Prop({ required: true, min: 1 }) cantidad: number;
    @Prop() notas?: string;
}
export const ItemOrdenSchema = SchemaFactory.createForClass(ItemOrden);

// ---- Embedded: dirección de entrega (snapshot) ----
@Schema({ _id: false })
export class DireccionEntrega {
    @Prop({ required: true }) calle: string;
    @Prop({ required: true }) ciudad: string;
    @Prop({ required: true }) pais: string;
}
export const DireccionEntregaSchema = SchemaFactory.createForClass(DireccionEntrega);

// ---- Orden ----
export type OrdenDocument = HydratedDocument<Orden>;

@Schema({ timestamps: true, collection: 'ordenes' })
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
        enum: ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'],
        default: 'pendiente',
    })
    estado: EstadoOrden;

    @Prop({ required: true, min: 0 }) total: number;

    @Prop({ type: DireccionEntregaSchema, required: true })
    direccion_entrega: DireccionEntrega;

    @Prop() notas?: string;
}

export const OrdenSchema = SchemaFactory.createForClass(Orden);

// ---- Índices ----
// Compuesto: historial de pedidos de un cliente filtrado por estado
OrdenSchema.index(
    { usuario_id: 1, estado: 1, createdAt: -1 },
    { name: 'idx_ordenes_usuario_estado_fecha' },
);
// Compuesto: pedidos de un restaurante por estado
OrdenSchema.index(
    { restaurante_id: 1, estado: 1, createdAt: -1 },
    { name: 'idx_ordenes_restaurante_estado_fecha' },
);
