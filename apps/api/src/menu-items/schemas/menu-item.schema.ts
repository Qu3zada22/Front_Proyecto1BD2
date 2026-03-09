import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MenuItemDocument = HydratedDocument<MenuItem>;

export type CategoriaMenu = 'entrada' | 'principal' | 'postre' | 'bebida' | 'extra';

@Schema({ timestamps: true, collection: 'menu_items' })
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
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// ---- Índices ----
// Compuesto: listar items disponibles de un restaurante
MenuItemSchema.index(
    { restaurante_id: 1, disponible: 1 },
    { name: 'idx_menuitems_restaurante_disponible' },
);
// Multikey: filtrar por etiquetas (campo array → MongoDB crea índice multikey)
MenuItemSchema.index({ etiquetas: 1 }, { name: 'idx_menuitems_etiquetas' });
// Compuesto: ordenar por categoría dentro de un restaurante
MenuItemSchema.index(
    { restaurante_id: 1, categoria: 1 },
    { name: 'idx_menuitems_restaurante_categoria' },
);
