import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Resena } from '../resenas/schemas/resena.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';

@Injectable()
export class UsuariosService {
    constructor(
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        @InjectModel(Orden.name) private ordenModel: Model<any>,
        @InjectModel(Resena.name) private resenaModel: Model<any>,
        @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
    ) { }

    async create(data: any): Promise<UsuarioDocument> {
        if (data.email) {
            data.email = data.email.toLowerCase().trim();
        }
        return this.usuarioModel.create(data);
    }

    async findAll(query: { rol?: string; email?: string; skip?: number; limit?: number } = {}): Promise<any[]> {
        const filter: any = {};
        if (query.rol) filter.rol = query.rol;
        if (query.email) {
            const escaped = query.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.email = new RegExp(escaped, 'i');
        }
        return this.usuarioModel
            .find(filter)
            .select('-password')
            .sort({ fecha_registro: -1 })
            .skip(query.skip ?? 0)
            .limit(query.limit ?? 50)
            .lean()
            .exec();
    }

    async login(email: string): Promise<any> {
        const usuario = await this.usuarioModel
            .findOne({ email: email.toLowerCase().trim(), activo: true })
            .lean().exec();
        if (!usuario) throw new UnauthorizedException('Usuario no encontrado o inactivo');
        const { password: _pw, ...safe } = usuario as any;
        return safe;
    }

    async findOne(id: string): Promise<UsuarioDocument> {
        const usuario = await this.usuarioModel
            .findById(id)
            .select('-password')
            .lean()
            .exec();
        if (!usuario) throw new NotFoundException('Usuario no encontrado');
        return usuario as UsuarioDocument;
    }

    async update(id: string, data: any): Promise<UsuarioDocument> {
        const updated = await this.usuarioModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .select('-password')
            .exec();
        if (!updated) throw new NotFoundException('Usuario no encontrado');
        return updated;
    }

    async remove(id: string): Promise<{ deleted: boolean }> {
        // Verificar datos asociados antes de eliminar
        const [ordenes, resenas, restaurantes] = await Promise.all([
            this.ordenModel.countDocuments({ usuario_id: id }),
            this.resenaModel.countDocuments({ usuario_id: id }),
            this.restauranteModel.countDocuments({ propietario_id: id }),
        ]);
        const asociados: string[] = [];
        if (ordenes > 0) asociados.push(`${ordenes} orden(es)`);
        if (resenas > 0) asociados.push(`${resenas} reseña(s)`);
        if (restaurantes > 0) asociados.push(`${restaurantes} restaurante(s)`);
        if (asociados.length > 0) {
            throw new BadRequestException(
                `No se puede eliminar: el usuario tiene ${asociados.join(', ')} asociados`,
            );
        }

        const result = await this.usuarioModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('Usuario no encontrado');
        return { deleted: true };
    }

    async findByEmail(email: string): Promise<UsuarioDocument> {
        const usuario = await this.usuarioModel
            .findOne({ email })
            .select('-password')
            .lean()
            .exec();
        if (!usuario) throw new NotFoundException('Usuario no encontrado');
        return usuario as UsuarioDocument;
    }

    // $push — agregar dirección al array embedded (máximo 10 según diseño)
    async addAddress(id: string, address: any): Promise<UsuarioDocument> {
        const updated = await this.usuarioModel
            .findByIdAndUpdate(
                id,
                { $push: { direcciones: { $each: [address], $slice: -10 } } },
                { new: true },
            )
            .select('-password')
            .exec();
        if (!updated) throw new NotFoundException('Usuario no encontrado');
        return updated;
    }

    // $pull — eliminar dirección del array por alias
    async removeAddress(id: string, alias: string): Promise<UsuarioDocument> {
        const updated = await this.usuarioModel
            .findByIdAndUpdate(
                id,
                { $pull: { direcciones: { alias } } },
                { new: true },
            )
            .select('-password')
            .exec();
        if (!updated) throw new NotFoundException('Usuario no encontrado');
        return updated;
    }
}
