import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MenuItemDocument = HydratedDocument<MenuItem>;

export type CategoriaMenu = 'entrada' | 'principal' | 'postre' | 'bebida' | 'extra';

@Schema({ timestamps: false, collection: 'menu_items' })
export class MenuItem {
    @Prop({ type: Types.ObjectId, ref: 'Restaurante', required: true })
    restaurante_id: Types.ObjectId;

    @Prop({ required: true }) nombre: string;

    @Prop() descripcion?: string;

    @Prop({ required: true, min: 0 }) precio: number;

    @Prop({
        type: String,
        enum: ['entrada', 'principal', 'postre', 'bebida', 'extra'],
        required: true,
    })
    categoria: CategoriaMenu;

    // Campo array → índice multikey automático
    @Prop({ type: [String], default: [] }) etiquetas: string[];

    // GridFS reference — ObjectId devuelto por POST /api/files/upload
    @Prop({ type: Types.ObjectId }) imagen_id?: Types.ObjectId;
    @Prop() imagen?: string;  // legacy string URL (compatibilidad)

    @Prop({ default: true }) disponible: boolean;

    @Prop({ default: 0 }) veces_ordenado: number;
    @Prop({ default: 0 }) orden_display: number;
    @Prop({ default: () => new Date() }) fecha_creacion: Date;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// ---- Índices ----
// Compuesto ESR: restaurante + categoria + disponible (platillos activos por categoría)
MenuItemSchema.index(
    { restaurante_id: 1, categoria: 1, disponible: 1 },
    { name: 'restaurante_categoria_disponible_esr' },
);
// Compuesto: listar items disponibles de un restaurante
MenuItemSchema.index(
    { restaurante_id: 1, disponible: 1 },
    { name: 'idx_menuitems_restaurante_disponible' },
);
// Multikey: filtrar por etiquetas (campo array → MongoDB crea índice multikey)
MenuItemSchema.index({ etiquetas: 1 }, { name: 'etiquetas_multikey' });
// Texto: búsqueda full-text en nombre y descripción
MenuItemSchema.index(
    { nombre: 'text', descripcion: 'text' },
    { name: 'nombre_descripcion_text' },
);
// Simple desc: ordenar por popularidad
MenuItemSchema.index({ veces_ordenado: -1 }, { name: 'veces_ordenado_desc' });
// Compuesto: ordenar por categoría dentro de un restaurante
MenuItemSchema.index(
    { restaurante_id: 1, categoria: 1 },
    { name: 'idx_menuitems_restaurante_categoria' },
);
// Simple: findAll filtrando solo por disponible sin restaurante_id (evita COLLSCAN con notablescan)
MenuItemSchema.index({ disponible: 1 }, { name: 'idx_menuitems_disponible' });
