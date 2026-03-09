import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// ---- Embedded: Horario por día ----
@Schema({ _id: false })
export class HorarioDia {
    @Prop({ required: true }) abre: string;
    @Prop({ required: true }) cierra: string;
    @Prop({ default: false }) cerrado: boolean;
}
export const HorarioDiaSchema = SchemaFactory.createForClass(HorarioDia);

// ---- Embedded: Dirección del restaurante ----
@Schema({ _id: false })
export class DireccionRestaurante {
    @Prop({ required: true }) calle: string;
    @Prop({ required: true }) ciudad: string;
    @Prop({ required: true }) pais: string;
    @Prop() codigo_postal?: string;
}
export const DireccionRestauranteSchema = SchemaFactory.createForClass(DireccionRestaurante);

// ---- Restaurante ----
export type RestauranteDocument = HydratedDocument<Restaurante>;

@Schema({ timestamps: true, collection: 'restaurantes' })
export class Restaurante {
    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    propietario_id: Types.ObjectId;

    @Prop({ required: true }) nombre: string;

    @Prop() descripcion?: string;

    // GeoJSON Point — requerido para índice 2dsphere
    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: { type: [Number], required: true },
    })
    ubicacion: { type: string; coordinates: [number, number] };

    @Prop({ type: DireccionRestauranteSchema })
    direccion: DireccionRestaurante;

    @Prop({ type: [String], default: [] }) categorias: string[];

    // Horario embedded: { lunes: { abre, cierra, cerrado }, ... }
    @Prop({ type: Object, default: {} })
    horario: Record<string, HorarioDia>;

    @Prop() telefono?: string;
    // GridFS reference — ObjectId devuelto por POST /api/files/upload
    @Prop({ type: Types.ObjectId }) img_portada_id?: Types.ObjectId;
    @Prop() img_portada?: string;  // legacy string URL (compatibilidad)

    @Prop({ default: 0 }) calificacion_prom: number;
    @Prop({ default: 0 }) total_resenas: number;
    @Prop({ default: true }) activo: boolean;
    @Prop({ default: () => new Date() }) fecha_creacion: Date;
}

export const RestauranteSchema = SchemaFactory.createForClass(Restaurante);

// ---- Índices ----
// Compuesto: listar restaurantes activos por nombre
RestauranteSchema.index({ nombre: 1, activo: 1 }, { name: 'idx_restaurantes_nombre_activo' });
// Geoespacial 2dsphere: búsqueda por proximidad ($near, $geoWithin)
RestauranteSchema.index({ ubicacion: '2dsphere' }, { name: 'idx_restaurantes_ubicacion_geo' });
// Texto: búsqueda full-text en nombre y descripción
RestauranteSchema.index(
    { nombre: 'text', descripcion: 'text' },
    { name: 'idx_restaurantes_text' },
);
// Multikey: filtrar por categorías (campo array)
RestauranteSchema.index({ categorias: 1 }, { name: 'idx_restaurantes_categorias' });
