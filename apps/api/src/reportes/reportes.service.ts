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
  ) {}

  // ── Agregaciones simples ─────────────────────────────────────────────────

  async ordenesPorEstado(): Promise<any[]> {
    return this.ordenModel.aggregate([
      { $group: { _id: '$estado', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $project: { estado: '$_id', total: 1, _id: 0 } },
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
      { $project: { rol: '$_id', total: 1, _id: 0 } },
    ]);
  }

  // ── Agregaciones complejas ───────────────────────────────────────────────

  // Pipeline parte de resenas (fuente de verdad), no del campo desnormalizado
  async topRestaurantes(limit = 10): Promise<any[]> {
    return this.resenaModel.aggregate([
      // $match primero — reduce volumen, usa índice restaurante_calificacion (IXSCAN)
      { $match: { activa: true, restaurante_id: { $exists: true } } },
      // $group — calcula promedio real desde la fuente de verdad
      {
        $group: {
          _id: '$restaurante_id',
          avg_calificacion: { $avg: '$calificacion' },
          cantidad_resenas: { $sum: 1 },
        },
      },
      // segundo $match — necesita el conteo calculado en el $group anterior
      { $match: { cantidad_resenas: { $gte: 5 } } },
      { $sort: { avg_calificacion: -1, cantidad_resenas: -1 } },
      { $limit: limit },
      // $lookup — trae nombre, categorías y ubicación del restaurante
      {
        $lookup: {
          from: 'restaurantes',
          localField: '_id',
          foreignField: '_id',
          pipeline: [
            { $match: { activo: true } },
            { $project: { nombre: 1, categorias: 1, ubicacion: 1, _id: 0 } },
          ],
          as: 'restaurante',
        },
      },
      // $unwind — convierte el array del lookup a objeto
      { $unwind: '$restaurante' },
      // $project — redondea promedio a 2 decimales con $round
      {
        $project: {
          nombre: '$restaurante.nombre',
          categorias: '$restaurante.categorias',
          ubicacion: '$restaurante.ubicacion',
          avg_calificacion: { $round: ['$avg_calificacion', 2] },
          cantidad_resenas: 1,
          _id: 0,
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
            // $toDecimal preserva precisión Decimal128 antes de acumular (diseño)
            $sum: { $toDecimal: '$items.subtotal' },
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
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$fecha_creacion' },
          },
          // $toDecimal preserva precisión Decimal128 antes de acumular (diseño)
          total_ingresos: { $sum: { $toDecimal: '$total' } },
          total_ordenes: { $sum: 1 },
          ticket_promedio: { $avg: { $toDecimal: '$total' } },
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
      { $project: { categoria: '$_id', total: 1, _id: 0 } },
    ]);
  }

  // Ingresos por restaurante agrupados por mes
  async ingresosPorRestaurantePorMes(): Promise<any[]> {
    return this.ordenModel.aggregate([
      { $match: { estado: 'entregado' } },
      {
        $group: {
          _id: {
            restaurante_id: '$restaurante_id',
            anio: { $year: '$fecha_creacion' },
            mes: { $month: '$fecha_creacion' },
          },
          // $toDecimal preserva precisión Decimal128 antes de acumular (diseño)
          total_ingresos: { $sum: { $toDecimal: '$total' } },
          total_ordenes: { $sum: 1 },
          ticket_promedio: { $avg: { $toDecimal: '$total' } },
        },
      },
      { $sort: { '_id.anio': -1, '_id.mes': -1, total_ingresos: -1 } },
      {
        $lookup: {
          from: 'restaurantes',
          localField: '_id.restaurante_id',
          foreignField: '_id',
          pipeline: [{ $project: { nombre: 1, _id: 0 } }],
          as: 'restaurante',
        },
      },
      {
        $project: {
          periodo: {
            $concat: [
              { $toString: '$_id.anio' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.mes', 10] },
                  { $concat: ['0', { $toString: '$_id.mes' }] },
                  { $toString: '$_id.mes' },
                ],
              },
            ],
          },
          restaurante: { $arrayElemAt: ['$restaurante.nombre', 0] },
          total_ingresos: { $round: ['$total_ingresos', 2] },
          total_ordenes: 1,
          ticket_promedio: { $round: ['$ticket_promedio', 2] },
          _id: 0,
        },
      },
    ]);
  }

  // Top usuarios por gasto acumulado en órdenes entregadas
  async usuariosConMayorGasto(limit = 10): Promise<any[]> {
    return this.ordenModel.aggregate([
      { $match: { estado: 'entregado' } },
      {
        $group: {
          _id: '$usuario_id',
          // $toDecimal preserva precisión Decimal128 antes de acumular (diseño)
          total_gastado: { $sum: { $toDecimal: '$total' } },
          total_ordenes: { $sum: 1 },
        },
      },
      { $sort: { total_gastado: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          pipeline: [{ $project: { nombre: 1, email: 1, _id: 0 } }],
          as: 'usuario',
        },
      },
      {
        $project: {
          usuario: { $arrayElemAt: ['$usuario', 0] },
          total_gastado: { $round: ['$total_gastado', 2] },
          total_ordenes: 1,
          _id: 0,
        },
      },
    ]);
  }
}
