import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { RestaurantesService } from './restaurantes.service';
import { Restaurante } from './schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Orden } from '../ordenes/schemas/orden.schema';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockQuery(resolvedValue: any) {
  const query: any = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  };
  return query;
}

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
  aggregate: jest.fn(),
  distinct: jest.fn(),
};

const mockMenuItemModel = {
  updateMany: jest.fn(),
};

const mockOrdenModel = {
  updateMany: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('RestaurantesService', () => {
  let service: RestaurantesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection.startSession.mockResolvedValue(mockSession);
    mockMenuItemModel.updateMany.mockResolvedValue({ modifiedCount: 5 });
    mockOrdenModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantesService,
        { provide: getModelToken(Restaurante.name), useValue: mockModel },
        { provide: getModelToken(MenuItem.name), useValue: mockMenuItemModel },
        { provide: getModelToken(Orden.name), useValue: mockOrdenModel },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<RestaurantesService>(RestaurantesService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call model.create with the provided data and return result', async () => {
      const data = { nombre: 'Pizza Palace', categorias: ['italiana'] };
      const created = { _id: 'abc123', ...data };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(created);
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return list with default sort/skip/limit when no query options given', async () => {
      const docs = [{ nombre: 'R1' }, { nombre: 'R2' }];
      const query = createMockQuery(docs);
      mockModel.find.mockReturnValue(query);

      const result = await service.findAll({});

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(query.sort).toHaveBeenCalledWith({ nombre: 1 });
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(20);
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(docs);
    });

    it('should apply activo filter when activo is string "true"', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ activo: 'true' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true }),
      );
    });

    it('should apply activo filter when activo is boolean true', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ activo: true });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true }),
      );
    });

    it('should apply categoria filter to categorias field', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ categoria: 'italiana' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ categorias: 'italiana' }),
      );
    });

    it('should apply $text search when busqueda is provided', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ busqueda: 'pizza' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'pizza' } }),
      );
    });

    it('should apply custom sort when sort option is provided', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ sort: 'calificacion_prom' });

      expect(query.sort).toHaveBeenCalledWith({ calificacion_prom: 1 });
    });

    it('should apply skip and limit from query', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ skip: 10, limit: 5 });

      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.limit).toHaveBeenCalledWith(5);
    });
  });

  // ── findNear ────────────────────────────────────────────────────────────────

  describe('findNear', () => {
    it('should query with $near operator and return results', async () => {
      const docs = [{ nombre: 'Nearby Resto' }];
      const query = createMockQuery(docs);
      mockModel.find.mockReturnValue(query);

      const result = await service.findNear(-90.5, 14.6, 5000);

      expect(mockModel.find).toHaveBeenCalledWith({
        ubicacion: {
          $near: {
            $geometry: { type: 'Point', coordinates: [-90.5, 14.6] },
            $maxDistance: 5000,
          },
        },
        activo: true,
      });
      expect(query.limit).toHaveBeenCalledWith(20);
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(docs);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the restaurante document when found', async () => {
      const doc = { _id: 'abc', nombre: 'Pizza Palace' };
      const query = createMockQuery(doc);
      mockModel.findById.mockReturnValue(query);

      const result = await service.findOne('abc');

      expect(mockModel.findById).toHaveBeenCalledWith('abc');
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when restaurante is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findById.mockReturnValue(query);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Restaurante no encontrado');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call findByIdAndUpdate with $set and return updated document', async () => {
      const updated = { _id: 'abc', nombre: 'Pizza Palace Updated' };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.update('abc', { nombre: 'Pizza Palace Updated' });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'abc',
        { $set: { nombre: 'Pizza Palace Updated' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when restaurante to update is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent', {})).rejects.toThrow('Restaurante no encontrado');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'abc' });
      mockModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('abc');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('abc');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when restaurante to delete is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Restaurante no encontrado');
    });
  });

  // ── cancelarRestaurante (ACID transaction) ───────────────────────────────────

  describe('cancelarRestaurante', () => {
    const restauranteId = '507f1f77bcf86cd799439011';
    const restauranteDoc = { _id: restauranteId, activo: false };

    it('should start a session and commit transaction on success', async () => {
      const query = createMockQuery(restauranteDoc);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await service.cancelarRestaurante(restauranteId);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should set activo=false on the restaurante within the session', async () => {
      const query = createMockQuery(restauranteDoc);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await service.cancelarRestaurante(restauranteId);

      const [id, update, opts] = mockModel.findByIdAndUpdate.mock.calls[0];
      expect(id).toBe(restauranteId);
      expect(update).toEqual({ $set: { activo: false } });
      expect(opts).toMatchObject({ new: true, session: mockSession });
    });

    it('should set disponible=false on all menu items of the restaurant', async () => {
      const query = createMockQuery(restauranteDoc);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await service.cancelarRestaurante(restauranteId);

      expect(mockMenuItemModel.updateMany).toHaveBeenCalledWith(
        { restaurante_id: restauranteDoc._id },
        { $set: { disponible: false } },
        { session: mockSession },
      );
    });

    it('should cancel all active orders and push to historial_estados', async () => {
      const query = createMockQuery(restauranteDoc);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await service.cancelarRestaurante(restauranteId);

      const [filter, update, opts] = mockOrdenModel.updateMany.mock.calls[0];
      expect(filter.restaurante_id).toBe(restauranteDoc._id);
      // Solo pendiente/en_proceso — en_camino ya está en tránsito (diseño)
      expect(filter.estado.$in).toEqual(['pendiente', 'en_proceso']);
      expect(update.$set.estado).toBe('cancelado');
      // $each+$slice:-5 mantiene el array acotado en máximo 5 transiciones (diseño)
      expect(update.$push.historial_estados.$each[0]).toMatchObject({ estado: 'cancelado' });
      expect(update.$push.historial_estados.$slice).toBe(-5);
      expect(opts).toMatchObject({ session: mockSession });
    });

    it('should return { cancelado: true, restaurante_id }', async () => {
      const query = createMockQuery(restauranteDoc);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.cancelarRestaurante(restauranteId);

      expect(result).toEqual({ cancelado: true, restaurante_id: restauranteId });
    });

    it('should throw NotFoundException and abort when restaurante is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.cancelarRestaurante('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should always call endSession even when an error occurs', async () => {
      mockModel.findByIdAndUpdate.mockReturnValue(createMockQuery(null));

      try {
        await service.cancelarRestaurante('nonexistent');
      } catch {
        // expected
      }

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
