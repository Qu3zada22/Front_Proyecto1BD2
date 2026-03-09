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
    { name: 'idx_resenas_restaurante_calificacion' },
);
// Simple: reseñas de un usuario
ResenaSchema.index({ usuario_id: 1 }, { name: 'idx_resenas_usuario' });
// Simple: reseñas por orden
ResenaSchema.index({ orden_id: 1 }, { name: 'idx_resenas_orden' });
// Simple desc: reseñas recientes primero
ResenaSchema.index({ fecha: -1 }, { name: 'idx_resenas_fecha_desc' });
// Multikey: filtrar por tags
ResenaSchema.index({ tags: 1 }, { name: 'idx_resenas_tags' });
// Texto: búsqueda en título y comentario
ResenaSchema.index(
    { titulo: 'text', comentario: 'text' },
    { name: 'idx_resenas_text' },
);
// Multikey: filtrar reseñas por usuario que dio like ($addToSet / $pull)
ResenaSchema.index({ likes: 1 }, { name: 'idx_resenas_likes' });
