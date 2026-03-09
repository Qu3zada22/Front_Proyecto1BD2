import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportesService } from './reportes.service';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Resena } from '../resenas/schemas/resena.schema';
import { Usuario } from '../usuarios/schemas/usuario.schema';

// ── mock models ───────────────────────────────────────────────────────────────

const mockOrdenModel = {
  aggregate: jest.fn(),
};
const mockRestauranteModel = {
  aggregate: jest.fn(),
  distinct: jest.fn(),
};
const mockMenuItemModel = {
  aggregate: jest.fn(),
};
const mockResenaModel = {
  aggregate: jest.fn(),
};
const mockUsuarioModel = {
  aggregate: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ReportesService', () => {
  let service: ReportesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: getModelToken(Orden.name), useValue: mockOrdenModel },
        { provide: getModelToken(Restaurante.name), useValue: mockRestauranteModel },
        { provide: getModelToken(MenuItem.name), useValue: mockMenuItemModel },
        { provide: getModelToken(Resena.name), useValue: mockResenaModel },
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  // ── ordenesPorEstado ─────────────────────────────────────────────────────────

  describe('ordenesPorEstado', () => {
    it('should aggregate ordenes grouped by estado', async () => {
      const expected = [
        { _id: 'entregado', total: 300 },
        { _id: 'pendiente', total: 50 },
      ];
      mockOrdenModel.aggregate.mockResolvedValue(expected);

      const result = await service.ordenesPorEstado();

      expect(mockOrdenModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];

      // Must group by $estado field
      expect(pipeline[0]).toEqual({
        $group: { _id: '$estado', total: { $sum: 1 } },
      });
      // Must sort by total descending
      expect(pipeline[1]).toEqual({ $sort: { total: -1 } });
      expect(result).toEqual(expected);
    });
  });

  // ── totalOrdenes ─────────────────────────────────────────────────────────────

  describe('totalOrdenes', () => {
    it('should return total count from $count aggregation', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([{ total: 50000 }]);

      const result = await service.totalOrdenes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $count: 'total' });
      expect(result).toEqual({ total: 50000 });
    });

    it('should return { total: 0 } when collection is empty', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      const result = await service.totalOrdenes();

      expect(result).toEqual({ total: 0 });
    });
  });

  // ── categoriasDistintas ──────────────────────────────────────────────────────

  describe('categoriasDistintas', () => {
    it('should call distinct on categorias field of restaurante collection', async () => {
      const categorias = ['italiana', 'mexicana', 'griega'];
      mockRestauranteModel.distinct.mockResolvedValue(categorias);

      const result = await service.categoriasDistintas();

      expect(mockRestauranteModel.distinct).toHaveBeenCalledWith('categorias');
      expect(result).toEqual(categorias);
    });
  });

  // ── usuariosPorRol ───────────────────────────────────────────────────────────

  describe('usuariosPorRol', () => {
    it('should aggregate usuarios grouped by rol', async () => {
      const expected = [
        { _id: 'cliente', total: 25 },
        { _id: 'propietario', total: 5 },
        { _id: 'admin', total: 1 },
      ];
      mockUsuarioModel.aggregate.mockResolvedValue(expected);

      const result = await service.usuariosPorRol();

      const pipeline = mockUsuarioModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $group: { _id: '$rol', total: { $sum: 1 } },
      });
      expect(result).toEqual(expected);
    });
  });

  // ── topRestaurantes ──────────────────────────────────────────────────────────

  describe('topRestaurantes', () => {
    it('should use $lookup on resenas collection and return top restaurants', async () => {
      const expected = [
        { nombre: 'Pizza Palace', avg_calificacion: 4.9, cantidad_resenas: 120 },
      ];
      mockRestauranteModel.aggregate.mockResolvedValue(expected);

      const result = await service.topRestaurantes(5);

      expect(mockRestauranteModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockRestauranteModel.aggregate.mock.calls[0][0];

      // Stage 0: $match activo: true
      expect(pipeline[0]).toEqual({ $match: { activo: true } });

      // Stage 1: $lookup on resenas
      expect(pipeline[1]).toMatchObject({
        $lookup: {
          from: 'resenas',
          localField: '_id',
          foreignField: 'restaurante_id',
          as: 'resenas',
        },
      });

      // Stage 2: $addFields with avg_calificacion and cantidad_resenas
      expect(pipeline[2]).toMatchObject({
        $addFields: {
          avg_calificacion: { $avg: '$resenas.calificacion' },
          cantidad_resenas: { $size: '$resenas' },
        },
      });

      // Stage 3: $match minimum 5 reviews (per design doc)
      expect(pipeline[3]).toEqual({
        $match: { cantidad_resenas: { $gte: 5 } },
      });

      // Stage 4: $sort by avg_calificacion desc
      expect(pipeline[4]).toEqual({
        $sort: { avg_calificacion: -1, cantidad_resenas: -1 },
      });

      // Stage 5: $limit applied with the argument
      expect(pipeline[5]).toEqual({ $limit: 5 });

      expect(result).toEqual(expected);
    });

    it('should use default limit of 10 when called without argument', async () => {
      mockRestauranteModel.aggregate.mockResolvedValue([]);

      await service.topRestaurantes();

      const pipeline = mockRestauranteModel.aggregate.mock.calls[0][0];
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);
      expect(limitStage).toEqual({ $limit: 10 });
    });
  });

  // ── platillosMasVendidos ──────────────────────────────────────────────────────

  describe('platillosMasVendidos', () => {
    it('should match only entregado orders and unwind items', async () => {
      const expected = [{ nombre: 'Burger', total_vendidos: 500, ingresos: 22500 }];
      mockOrdenModel.aggregate.mockResolvedValue(expected);

      const result = await service.platillosMasVendidos(5);

      expect(mockOrdenModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];

      // Stage 0: match estado entregado
      expect(pipeline[0]).toEqual({ $match: { estado: 'entregado' } });

      // Stage 1: $unwind items array
      expect(pipeline[1]).toEqual({ $unwind: '$items' });

      expect(result).toEqual(expected);
    });

    it('should group by items.item_id (NOT menu_item_id) — verify correct field name', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.platillosMasVendidos();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage).toBeDefined();
      // Must use $items.item_id as the group key
      expect(groupStage.$group._id).toBe('$items.item_id');
      // Must NOT use $items.menu_item_id
      expect(groupStage.$group._id).not.toBe('$items.menu_item_id');
    });

    it('should sum items.cantidad as total_vendidos', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.platillosMasVendidos();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage.$group.total_vendidos).toEqual({ $sum: '$items.cantidad' });
    });

    it('should compute ingresos from items.subtotal using $toDouble', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.platillosMasVendidos();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage.$group.ingresos).toEqual({
        $sum: { $toDouble: '$items.subtotal' },
      });
    });

    it('should sort by total_vendidos descending and apply limit', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.platillosMasVendidos(3);

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((s: any) => s.$sort !== undefined);
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);

      expect(sortStage).toEqual({ $sort: { total_vendidos: -1 } });
      expect(limitStage).toEqual({ $limit: 3 });
    });

    it('should use default limit of 10 when called without argument', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.platillosMasVendidos();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);
      expect(limitStage).toEqual({ $limit: 10 });
    });
  });

  // ── ingresosPorDia ────────────────────────────────────────────────────────────

  describe('ingresosPorDia', () => {
    it('should match by fecha_creacion field (NOT createdAt) within date range', async () => {
      const expected = [{ fecha: '2026-03-01', total_ingresos: 1500, total_ordenes: 30 }];
      mockOrdenModel.aggregate.mockResolvedValue(expected);

      const result = await service.ingresosPorDia('2026-03-01', '2026-03-07');

      expect(mockOrdenModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline[0];

      // Must filter by estado entregado
      expect(matchStage.$match.estado).toBe('entregado');

      // Must use fecha_creacion field, NOT createdAt
      expect(matchStage.$match.fecha_creacion).toBeDefined();
      expect((matchStage.$match as any).createdAt).toBeUndefined();

      // fecha_creacion must have $gte and $lte date range
      expect(matchStage.$match.fecha_creacion.$gte).toBeInstanceOf(Date);
      expect(matchStage.$match.fecha_creacion.$lte).toBeInstanceOf(Date);

      expect(result).toEqual(expected);
    });

    it('should use $dateToString on fecha_creacion field for grouping', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage).toBeDefined();
      // Must group by fecha_creacion via $dateToString, not createdAt
      expect(groupStage.$group._id).toEqual({
        $dateToString: { format: '%Y-%m-%d', date: '$fecha_creacion' },
      });
      expect(groupStage.$group._id).not.toEqual(
        expect.objectContaining({ date: '$createdAt' }),
      );
    });

    it('should compute total_ingresos using $toDouble on total field', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage.$group.total_ingresos).toEqual({
        $sum: { $toDouble: '$total' },
      });
    });

    it('should compute ticket_promedio using $avg on total', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage.$group.ticket_promedio).toEqual({
        $avg: { $toDouble: '$total' },
      });
    });

    it('should sort results by date ascending', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((s: any) => s.$sort !== undefined);

      expect(sortStage).toEqual({ $sort: { _id: 1 } });
    });

    it('should project fecha (renaming _id), total_ingresos, total_ordenes, ticket_promedio', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const projectStage = pipeline.find((s: any) => s.$project !== undefined);

      expect(projectStage).toBeDefined();
      expect(projectStage.$project.fecha).toBe('$_id');
      expect(projectStage.$project._id).toBe(0);
    });

    it('should set end date time to end of day (23:59:59.999)', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorDia('2026-03-01', '2026-03-07');

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline[0];
      const endDate: Date = matchStage.$match.fecha_creacion.$lte;

      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);
    });
  });

  // ── ingresosPorRestaurantePorMes ──────────────────────────────────────────────

  describe('ingresosPorRestaurantePorMes', () => {
    it('should group by restaurante_id, year and month', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorRestaurantePorMes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage).toBeDefined();
      expect(groupStage.$group._id).toMatchObject({
        restaurante_id: '$restaurante_id',
        anio: { $year: '$fecha_creacion' },
        mes: { $month: '$fecha_creacion' },
      });
    });

    it('should sum total_ingresos using $toDouble on total (Decimal128 compat)', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorRestaurantePorMes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage.$group.total_ingresos).toEqual({
        $sum: { $toDouble: '$total' },
      });
    });

    it('should include $lookup to restaurantes collection', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorRestaurantePorMes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find((s: any) => s.$lookup !== undefined);

      expect(lookupStage).toBeDefined();
      expect(lookupStage.$lookup.from).toBe('restaurantes');
      expect(lookupStage.$lookup.localField).toBe('_id.restaurante_id');
    });

    it('should zero-pad single-digit months in periodo (e.g. "2025-01" not "2025-1")', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorRestaurantePorMes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const projectStage = pipeline.find((s: any) => s.$project !== undefined);

      expect(projectStage).toBeDefined();
      const periodo = projectStage.$project.periodo;

      // Must use $concat with a $cond for zero-padding
      expect(periodo.$concat).toBeDefined();
      expect(periodo.$concat).toHaveLength(3); // ['year', '-', padded-month]

      const paddedMonth = periodo.$concat[2];
      // The third element must be a $cond expression (not a plain $toString)
      expect(paddedMonth.$cond).toBeDefined();
      // The condition must check $lt mes < 10
      expect(paddedMonth.$cond[0]).toEqual({ $lt: ['$_id.mes', 10] });
      // If < 10: prepend '0'
      expect(paddedMonth.$cond[1]).toMatchObject({ $concat: ['0', expect.anything()] });
    });

    it('should sort by year desc, month desc, total_ingresos desc', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.ingresosPorRestaurantePorMes();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((s: any) => s.$sort !== undefined);

      expect(sortStage).toEqual({
        $sort: { '_id.anio': -1, '_id.mes': -1, total_ingresos: -1 },
      });
    });
  });

  // ── restaurantesPorCategoria ──────────────────────────────────────────────────

  describe('restaurantesPorCategoria', () => {
    it('should unwind categorias array and group by categoria', async () => {
      const expected = [
        { _id: 'italiana', total: 5 },
        { _id: 'mexicana', total: 3 },
      ];
      mockRestauranteModel.aggregate.mockResolvedValue(expected);

      const result = await service.restaurantesPorCategoria();

      expect(mockRestauranteModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockRestauranteModel.aggregate.mock.calls[0][0];

      // Stage 0: $unwind categorias
      expect(pipeline[0]).toEqual({ $unwind: '$categorias' });

      // Stage 1: group by categoria
      expect(pipeline[1]).toEqual({
        $group: { _id: '$categorias', total: { $sum: 1 } },
      });

      // Stage 2: sort by total descending
      expect(pipeline[2]).toEqual({ $sort: { total: -1 } });

      expect(result).toEqual(expected);
    });
  });

  // ── usuariosConMayorGasto ─────────────────────────────────────────────────────

  describe('usuariosConMayorGasto', () => {
    it('should match only entregado orders', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { estado: 'entregado' } });
    });

    it('should group by usuario_id summing total_gastado using $toDouble', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const groupStage = pipeline.find((s: any) => s.$group !== undefined);

      expect(groupStage).toBeDefined();
      expect(groupStage.$group._id).toBe('$usuario_id');
      expect(groupStage.$group.total_gastado).toEqual({
        $sum: { $toDouble: '$total' },
      });
      expect(groupStage.$group.total_ordenes).toEqual({ $sum: 1 });
    });

    it('should sort by total_gastado descending', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((s: any) => s.$sort !== undefined);

      expect(sortStage).toEqual({ $sort: { total_gastado: -1 } });
    });

    it('should apply the limit argument', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto(5);

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);

      expect(limitStage).toEqual({ $limit: 5 });
    });

    it('should use default limit of 10 when called without argument', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);

      expect(limitStage).toEqual({ $limit: 10 });
    });

    it('should include $lookup to usuarios collection joining on _id', async () => {
      mockOrdenModel.aggregate.mockResolvedValue([]);

      await service.usuariosConMayorGasto();

      const pipeline = mockOrdenModel.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find((s: any) => s.$lookup !== undefined);

      expect(lookupStage).toBeDefined();
      expect(lookupStage.$lookup.from).toBe('usuarios');
      expect(lookupStage.$lookup.localField).toBe('_id');
      expect(lookupStage.$lookup.foreignField).toBe('_id');
    });

    it('should return aggregation results', async () => {
      const expected = [
        { usuario: { nombre: 'Ana', email: 'ana@example.com' }, total_gastado: 5000, total_ordenes: 42 },
      ];
      mockOrdenModel.aggregate.mockResolvedValue(expected);

      const result = await service.usuariosConMayorGasto(1);

      expect(result).toEqual(expected);
    });
  });
});
