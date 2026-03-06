import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';

@Injectable()
export class MenuItemsService {
  constructor(@InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>) {}

  async create(data: Partial<MenuItem>): Promise<MenuItemDocument> {
    return this.menuItemModel.create(data);
  }

  async findAll(query: {
    restaurante_id?: string;
    categoria?: string;
    etiqueta?: string;
    disponible?: string;
    skip?: string;
    limit?: string;
  }): Promise<MenuItemDocument[]> {
    const filter: any = {};
    if (query.restaurante_id) filter.restaurante_id = query.restaurante_id;
    if (query.categoria) filter.categoria = query.categoria;
    if (query.etiqueta) filter.etiquetas = query.etiqueta;
    if (query.disponible !== undefined) filter.disponible = query.disponible === 'true';

    return this.menuItemModel
      .find(filter)
      .sort({ categoria: 1, nombre: 1 })
      .skip(parseInt(query.skip ?? '0'))
      .limit(parseInt(query.limit ?? '50'))
      .lean()
      .exec() as Promise<MenuItemDocument[]>;
  }

  async findOne(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  async update(id: string, data: Partial<MenuItem>): Promise<MenuItemDocument> {
    const updated = await this.menuItemModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Item no encontrado');
    return updated;
  }

  // Actualizar varios documentos a la vez
  async updateMany(restauranteId: string, data: Partial<MenuItem>): Promise<{ modified: number }> {
    const result = await this.menuItemModel
      .updateMany({ restaurante_id: restauranteId }, { $set: data })
      .exec();
    return { modified: result.modifiedCount };
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Item no encontrado');
    return { deleted: true };
  }

  // $addToSet — agregar etiqueta sin duplicados
  async addTag(id: string, tag: string): Promise<MenuItemDocument> {
    const updated = await this.menuItemModel
      .findByIdAndUpdate(id, { $addToSet: { etiquetas: tag } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Item no encontrado');
    return updated;
  }
}
