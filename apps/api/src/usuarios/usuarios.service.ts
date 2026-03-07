import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

@Injectable()
export class UsuariosService {
    constructor(@InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>) { }

    async create(data: any): Promise<UsuarioDocument> {
        return this.usuarioModel.create(data);
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
        const result = await this.usuarioModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('Usuario no encontrado');
        return { deleted: true };
    }

    // $push — agregar dirección al array embedded
    async addAddress(id: string, address: any): Promise<UsuarioDocument> {
        const updated = await this.usuarioModel
            .findByIdAndUpdate(id, { $push: { direcciones: address } }, { new: true })
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
