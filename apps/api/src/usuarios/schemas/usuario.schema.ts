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
export const DireccionUsuarioSchema =
  SchemaFactory.createForClass(DireccionUsuario);

// ---- Usuario ----
export type UsuarioDocument = HydratedDocument<Usuario>;

export type Rol = 'cliente' | 'propietario' | 'admin';

@Schema({ timestamps: false, collection: 'usuarios' })
export class Usuario {
  @Prop({ required: true }) nombre: string;

  @Prop({ required: true }) email: string;

  @Prop({ required: true }) password: string;

  @Prop() telefono?: string;

  @Prop({
    type: String,
    enum: ['cliente', 'propietario', 'admin'],
    default: 'cliente',
  })
  rol: Rol;

  @Prop({ default: true }) activo: boolean;

  @Prop({ default: () => new Date() }) fecha_registro: Date;

  @Prop({ type: [String], default: [] }) preferencias: string[];

  @Prop({ type: [DireccionUsuarioSchema], default: [] })
  direcciones: DireccionUsuario[];
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

// ---- Índices ----
// Único: búsqueda por email (login)
UsuarioSchema.index({ email: 1 }, { unique: true, name: 'email_unique' });
// Multikey: filtrar por ciudad en array de direcciones embebidas
UsuarioSchema.index(
  { 'direcciones.ciudad': 1 },
  { name: 'direcciones_ciudad_multikey' },
);
// Texto: búsqueda full-text por nombre
UsuarioSchema.index({ nombre: 'text' }, { name: 'nombre_text' });
// Simple: filtrar por rol
UsuarioSchema.index({ rol: 1 }, { name: 'rol_simple' });
// Compuesto: filtrar usuarios activos por rol
UsuarioSchema.index({ rol: 1, activo: 1 }, { name: 'idx_usuarios_rol_activo' });
// Multikey: filtrar/sugerir por preferencias alimentarias ['vegano','sin_gluten',...]
UsuarioSchema.index({ preferencias: 1 }, { name: 'idx_usuarios_preferencias' });
// Simple desc: findAll ordenado por fecha de registro (evita COLLSCAN con notablescan)
UsuarioSchema.index(
  { fecha_registro: -1 },
  { name: 'idx_usuarios_fecha_registro' },
);
