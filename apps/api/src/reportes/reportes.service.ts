import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Resena } from '../resenas/schemas/resena.schema';
import { Usuario } from '../usuarios/schemas/usuario.schema';

@Injectable()
export class ReportesService {
    constructor(
        @InjectModel(Orden.name) private ordenModel: Model<any>,
        @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<any>,
        @InjectModel(Resena.name) private resenaModel: Model<any>,
        @InjectModel(Usuario.name) private usuarioModel: Model<any>,
    ) { }

    // ── Agregaciones simples ─────────────────────────────────────────────────

    async ordenesPorEstado(): Promise<any[]> {
        return this.ordenModel.aggregate([
            { $group: { _id: '$estado', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }

    async totalOrdenes(): Promise<{ total: number }> {
        const [result] = await this.ordenModel.aggregate([{ $count: 'total' }]);
        return result ?? { total: 0 };
    }

    async categoriasDistintas(): Promise<string[]> {
        return this.restauranteModel.distinct('categorias');
    }

    async usuariosPorRol(): Promise<any[]> {
        return this.usuarioModel.aggregate([
            { $group: { _id: '$rol', total: { $sum: 1 } } },
        ]);
    }

    // ── Agregaciones complejas ───────────────────────────────────────────────

    async topRestaurantes(limit = 10): Promise<any[]> {
        return this.restauranteModel.aggregate([
            { $match: { activo: true } },
            {
                $lookup: {
                    from: 'resenas',
                    localField: '_id',
                    foreignField: 'restaurante_id',
                    as: 'resenas',
                },
            },
            {
                $addFields: {
                    avg_calificacion: { $avg: '$resenas.calificacion' },
                    cantidad_resenas: { $size: '$resenas' },
                },
            },
            // mínimo 5 reseñas (según diseño doc)
            { $match: { cantidad_resenas: { $gte: 5 } } },
            { $sort: { avg_calificacion: -1, cantidad_resenas: -1 } },
            { $limit: limit },
            {
                $project: {
                    nombre: 1,
                    categorias: 1,
                    direccion: 1,
                    calificacion_prom: 1,
                    avg_calificacion: { $round: ['$avg_calificacion', 2] },
                    cantidad_resenas: 1,
                },
            },
        ]);
    }

    async platillosMasVendidos(limit = 10): Promise<any[]> {
        return this.ordenModel.aggregate([
            { $match: { estado: 'entregado' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.item_id',
                    nombre: { $first: '$items.nombre' },
                    total_vendidos: { $sum: '$items.cantidad' },
                    ingresos: {
                        $sum: { $toDouble: '$items.subtotal' },
                    },
                },
            },
            { $sort: { total_vendidos: -1 } },
            { $limit: limit },
            {
                $project: {
                    nombre: 1,
                    total_vendidos: 1,
                    ingresos: { $round: ['$ingresos', 2] },
                },
            },
        ]);
    }

    async ingresosPorDia(desde: string, hasta: string): Promise<any[]> {
        const startDate = new Date(desde);
        const endDate = new Date(hasta);
        endDate.setHours(23, 59, 59, 999);

        return this.ordenModel.aggregate([
            {
                $match: {
                    estado: 'entregado',
                    fecha_creacion: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha_creacion' } },
                    total_ingresos: { $sum: { $toDouble: '$total' } },
                    total_ordenes: { $sum: 1 },
                    ticket_promedio: { $avg: { $toDouble: '$total' } },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    fecha: '$_id',
                    total_ingresos: { $round: ['$total_ingresos', 2] },
                    total_ordenes: 1,
                    ticket_promedio: { $round: ['$ticket_promedio', 2] },
                    _id: 0,
                },
            },
        ]);
    }

    async restaurantesPorCategoria(): Promise<any[]> {
        return this.restauranteModel.aggregate([
            { $unwind: '$categorias' },
            { $group: { _id: '$categorias', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }
}
