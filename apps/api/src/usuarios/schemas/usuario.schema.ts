import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ---- Embedded: Dirección ----
@Schema({ _id: false })
export class DireccionUsuario {
    @Prop({ required: true }) alias: string;
    @Prop({ required: true }) calle: string;
    @Prop({ required: true }) ciudad: string;
    @Prop({ required: true }) pais: string;
    @Prop({ default: false }) es_principal: boolean;
    @Prop({
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
    })
    coords?: { type: string; coordinates: [number, number] };
}
export const DireccionUsuarioSchema = SchemaFactory.createForClass(DireccionUsuario);

// ---- Usuario ----
export type UsuarioDocument = HydratedDocument<Usuario>;

export type Rol = 'cliente' | 'propietario' | 'admin';

@Schema({ timestamps: true, collection: 'usuarios' })
export class Usuario {
    @Prop({ required: true }) nombre: string;

    @Prop({ required: true }) email: string;

    @Prop({ required: true }) password: string;

    @Prop() telefono?: string;

    @Prop({ type: String, enum: ['cliente', 'propietario', 'admin'], default: 'cliente' })
    rol: Rol;

    @Prop({ default: true }) activo: boolean;

    @Prop({ default: () => new Date() }) fecha_registro: Date;

    @Prop({ type: [String], default: [] }) preferencias: string[];

    @Prop({ type: [DireccionUsuarioSchema], default: [] })
    direcciones: DireccionUsuario[];
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

// ---- Índices ----
// Simple: búsqueda por email (login)
UsuarioSchema.index({ email: 1 }, { unique: true, name: 'idx_usuarios_email' });
// Compuesto: filtrar usuarios activos por rol
UsuarioSchema.index({ rol: 1, activo: 1 }, { name: 'idx_usuarios_rol_activo' });
