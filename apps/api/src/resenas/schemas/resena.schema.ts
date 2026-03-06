import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ResenaDocument = HydratedDocument<Resena>;

@Schema({ timestamps: true, collection: 'resenas' })
export class Resena {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  cliente_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Restaurante', required: true })
  restaurante_id: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 }) calificacion: number;

  @Prop() comentario?: string;
}

export const ResenaSchema = SchemaFactory.createForClass(Resena);

// ---- Índices ----
// Compuesto: reseñas de un restaurante ordenadas por calificación
ResenaSchema.index(
  { restaurante_id: 1, calificacion: -1 },
  { name: 'idx_resenas_restaurante_calificacion' },
);
// Compuesto: evitar reseñas duplicadas del mismo usuario al mismo restaurante
ResenaSchema.index(
  { cliente_id: 1, restaurante_id: 1 },
  { unique: true, name: 'idx_resenas_cliente_restaurante_unique' },
);
