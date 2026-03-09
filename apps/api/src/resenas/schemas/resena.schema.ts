import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ResenaDocument = HydratedDocument<Resena>;

@Schema({ timestamps: false, collection: 'resenas' })
export class Resena {
    // campo igual al seed: 'usuario_id' (no 'cliente_id')
    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    usuario_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Restaurante' })
    restaurante_id?: Types.ObjectId;

    // FK opcional a la orden que originó la reseña
    @Prop({ type: Types.ObjectId, ref: 'Orden' })
    orden_id?: Types.ObjectId;

    @Prop({ required: true, min: 1, max: 5 }) calificacion: number;

    @Prop() titulo?: string;

    @Prop() comentario?: string;

    // Array multikey: ['rapido','sabroso','limpio']
    @Prop({ type: [String], default: [] }) tags: string[];

    // Array de ObjectIds — $addToSet / $pull para likes
    @Prop({ type: [Types.ObjectId], default: [] }) likes: Types.ObjectId[];

    // Soft delete — filtrar en queries
    @Prop({ default: true }) activa: boolean;

    @Prop({ default: () => new Date() }) fecha: Date;
}

export const ResenaSchema = SchemaFactory.createForClass(Resena);

// ---- Índices ----
// Compuesto: reseñas de un restaurante ordenadas por calificación
ResenaSchema.index(
    { restaurante_id: 1, calificacion: -1 },
    { name: 'restaurante_calificacion' },
);
// Simple: reseñas de un usuario
ResenaSchema.index({ usuario_id: 1 }, { name: 'usuario_id_simple' });
// Simple: reseñas por orden
ResenaSchema.index({ orden_id: 1 }, { name: 'orden_id_simple' });
// Simple desc: reseñas recientes primero
ResenaSchema.index({ fecha: -1 }, { name: 'fecha_desc' });
// Multikey: filtrar por tags
ResenaSchema.index({ tags: 1 }, { name: 'tags_multikey' });
// Texto: búsqueda en título y comentario
ResenaSchema.index(
    { titulo: 'text', comentario: 'text' },
    { name: 'titulo_comentario_text' },
);
// Multikey: filtrar reseñas por usuario que dio like ($addToSet / $pull)
ResenaSchema.index({ likes: 1 }, { name: 'idx_resenas_likes' });
// Simple: filtrar reseñas activas/inactivas (soft-delete, evita COLLSCAN con notablescan)
ResenaSchema.index({ activa: 1 }, { name: 'idx_resenas_activa' });
