import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
  ) {}

    async create(dto: CreateMenuItemDto): Promise<MenuItemDocument> {
        const restauranteOid = new Types.ObjectId(dto.restaurante_id);
        const restExists = await this.restauranteModel.countDocuments({ _id: restauranteOid, activo: true });
        if (!restExists) throw new BadRequestException('El restaurante referenciado no existe o está inactivo');

        const doc: any = {
            restaurante_id: restauranteOid,
            nombre: dto.nombre,
            precio: dto.precio,
            categoria: dto.categoria,
        };
        if (dto.descripcion !== undefined) doc.descripcion = dto.descripcion;
        if (dto.etiquetas !== undefined) doc.etiquetas = dto.etiquetas;
        if (dto.imagen !== undefined) doc.imagen = dto.imagen;
        if (dto.imagen_id !== undefined) doc.imagen_id = new Types.ObjectId(dto.imagen_id);
        if (dto.disponible !== undefined) doc.disponible = dto.disponible;
        if (dto.orden_display !== undefined) doc.orden_display = dto.orden_display;

        return this.menuItemModel.create(doc);
    }

    async findAll(query: {
        restaurante_id?: string;
        categoria?: string;
        etiqueta?: string;
        disponible?: boolean;
        skip?: number;
        limit?: number;
    }): Promise<MenuItemDocument[]> {
        const filter: any = {};
        if (query.disponible !== undefined) filter.disponible = query.disponible;
        if (query.restaurante_id) filter.restaurante_id = new Types.ObjectId(query.restaurante_id);
        if (query.categoria) filter.categoria = query.categoria;
        if (query.etiqueta) filter.etiquetas = query.etiqueta;

    return this.menuItemModel
      .find(filter)
      .sort({ categoria: 1, nombre: 1 })
      .skip(query.skip ?? 0)
      .limit(query.limit ?? 50)
      .lean()
      .exec() as Promise<MenuItemDocument[]>;
  }

  async findOne(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

    async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItemDocument> {
        const patch: any = { ...dto };
        if (dto.imagen_id) patch.imagen_id = new Types.ObjectId(dto.imagen_id);
        const updated = await this.menuItemModel
            .findByIdAndUpdate(id, { $set: patch }, { new: true })
            .exec();
        if (!updated) throw new NotFoundException('Item no encontrado');
        return updated;
    }

  async updateMany(
    restauranteId: string,
    dto: UpdateMenuItemDto,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.menuItemModel
      .updateMany(
        { restaurante_id: new Types.ObjectId(restauranteId) },
        { $set: dto },
      )
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Item no encontrado');
    return { deleted: true };
  }

  async removeByRestaurant(
    restauranteId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.menuItemModel
      .deleteMany({ restaurante_id: new Types.ObjectId(restauranteId) })
      .exec();
    return { deleted: result.deletedCount };
  }

  // $addToSet — agregar etiqueta sin duplicados
  async addTag(id: string, tag: string): Promise<MenuItemDocument> {
    const updated = await this.menuItemModel
      .findByIdAndUpdate(id, { $addToSet: { etiquetas: tag } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Item no encontrado');
    return updated;
  }

  // $pull — eliminar etiqueta del array
  async removeTag(id: string, tag: string): Promise<MenuItemDocument> {
    const updated = await this.menuItemModel
      .findByIdAndUpdate(id, { $pull: { etiquetas: tag } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Item no encontrado');
    return updated;
  }
}
