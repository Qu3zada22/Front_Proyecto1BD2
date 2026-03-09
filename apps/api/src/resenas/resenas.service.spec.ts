import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ResenasService } from './resenas.service';
import { Resena } from './schemas/resena.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
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

const mockResenaModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
};

const mockRestauranteModel = {
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
};

const mockOrdenModel = {
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ResenasService', () => {
  let service: ResenasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRestauranteModel.findByIdAndUpdate.mockResolvedValue({});
    mockOrdenModel.findByIdAndUpdate.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResenasService,
        { provide: getModelToken(Resena.name), useValue: mockResenaModel },
        { provide: getModelToken(Restaurante.name), useValue: mockRestauranteModel },
        { provide: getModelToken(Orden.name), useValue: mockOrdenModel },
      ],
    }).compile();

    service = module.get<ResenasService>(ResenasService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const restauranteId = new Types.ObjectId().toString();
    const ordenId = new Types.ObjectId().toString();

    it('should call model.create with the provided data and return the result', async () => {
      const data = { usuario_id: new Types.ObjectId().toString(), restaurante_id: restauranteId, calificacion: 5 };
      const created = { _id: 'r1', ...data };
      mockResenaModel.create.mockResolvedValue(created);
      mockResenaModel.aggregate.mockResolvedValue([{ avg: 5, count: 1 }]);

      const result = await service.create(data);

      expect(mockResenaModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(created);
    });

    it('should update calificacion_prom and total_resenas on the restaurante after create', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, calificacion: 4 };
      mockResenaModel.create.mockResolvedValue({ _id: 'r1', ...data });
      mockResenaModel.aggregate.mockResolvedValue([{ avg: 4.2, count: 10 }]);

      await service.create(data);

      expect(mockResenaModel.aggregate).toHaveBeenCalled();
      expect(mockRestauranteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        restauranteId,
        expect.objectContaining({ $set: expect.objectContaining({ calificacion_prom: 4.2, total_resenas: 10 }) }),
      );
    });

    it('should update tiene_resena on the orden when orden_id is provided', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, orden_id: ordenId, calificacion: 5 };
      mockResenaModel.create.mockResolvedValue({ _id: 'r1', ...data });
      mockResenaModel.aggregate.mockResolvedValue([{ avg: 5, count: 1 }]);

      await service.create(data);

      expect(mockOrdenModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ordenId,
        { $set: { tiene_resena: true } },
      );
    });

    it('should NOT update restaurante when restaurante_id is absent', async () => {
      const data = { usuario_id: 'u1', calificacion: 3 };
      mockResenaModel.create.mockResolvedValue({ _id: 'r1', ...data });

      await service.create(data);

      expect(mockRestauranteModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should NOT update orden when orden_id is absent', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, calificacion: 3 };
      mockResenaModel.create.mockResolvedValue({ _id: 'r1', ...data });
      mockResenaModel.aggregate.mockResolvedValue([{ avg: 3, count: 5 }]);

      await service.create(data);

      expect(mockOrdenModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ── findByRestaurant ─────────────────────────────────────────────────────────

  describe('findByRestaurant', () => {
    const restauranteId = '507f1f77bcf86cd799439011';

    it('should filter by restaurante_id as ObjectId and activa: true', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      const callArg = mockResenaModel.find.mock.calls[0][0];
      expect(callArg.restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.restaurante_id.toString()).toBe(restauranteId);
      expect(callArg.activa).toBe(true);
    });

    it('should populate usuario_id with only the nombre field', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.populate).toHaveBeenCalledWith('usuario_id', 'nombre');
    });

    it('should use default sort by calificacion descending when sort is omitted', async () => {
      const resenas = [{ calificacion: 5 }, { calificacion: 4 }];
      const query = createMockQuery(resenas);
      mockResenaModel.find.mockReturnValue(query);

      const result = await service.findByRestaurant(restauranteId);

      expect(query.sort).toHaveBeenCalledWith({ calificacion: -1 });
      expect(result).toEqual(resenas);
    });

    it('should sort by calificacion descending when sort="calificacion"', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'calificacion');

      expect(query.sort).toHaveBeenCalledWith({ calificacion: -1 });
    });

    it('should sort by fecha descending when sort="fecha"', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'fecha');

      expect(query.sort).toHaveBeenCalledWith({ fecha: -1 });
    });

    it('should apply default skip=0 and limit=10', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(10);
    });

    it('should apply custom skip and limit', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'calificacion', 5, 20);

      expect(query.skip).toHaveBeenCalledWith(5);
      expect(query.limit).toHaveBeenCalledWith(20);
    });

    it('should call lean and exec', async () => {
      const query = createMockQuery([]);
      mockResenaModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
    });
  });

  // ── addLike ($addToSet) ───────────────────────────────────────────────────────

  describe('addLike', () => {
    const resenaId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439022';

    it('should call $addToSet on likes array with the userId as ObjectId', async () => {
      const updated = { _id: resenaId, likes: [new Types.ObjectId(userId)] };
      const query = createMockQuery(updated);
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.addLike(resenaId, userId);

      expect(mockResenaModel.findByIdAndUpdate).toHaveBeenCalledWith(
        resenaId,
        { $addToSet: { likes: new Types.ObjectId(userId) } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when resena is not found', async () => {
      const query = createMockQuery(null);
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.addLike(resenaId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.addLike(resenaId, userId)).rejects.toThrow('Reseña no encontrada');
    });

    it('should return the updated resena', async () => {
      const updated = { _id: resenaId, likes: [new Types.ObjectId(userId)] };
      const query = createMockQuery(updated);
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.addLike(resenaId, userId);

      expect(result).toEqual(updated);
    });
  });

  // ── removeLike ($pull) ────────────────────────────────────────────────────────

  describe('removeLike', () => {
    const resenaId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439022';

    it('should call $pull on likes array to remove the userId', async () => {
      const updated = { _id: resenaId, likes: [] };
      const query = createMockQuery(updated);
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.removeLike(resenaId, userId);

      expect(mockResenaModel.findByIdAndUpdate).toHaveBeenCalledWith(
        resenaId,
        { $pull: { likes: new Types.ObjectId(userId) } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when resena is not found', async () => {
      const query = createMockQuery(null);
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.removeLike(resenaId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.removeLike(resenaId, userId)).rejects.toThrow('Reseña no encontrada');
    });

    it('addLike and removeLike use different MongoDB operators', async () => {
      const query = createMockQuery({ _id: resenaId, likes: [] });
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      await service.addLike(resenaId, userId);
      const addCall = mockResenaModel.findByIdAndUpdate.mock.calls[0][1];
      expect(addCall.$addToSet).toBeDefined();
      expect(addCall.$pull).toBeUndefined();

      jest.clearAllMocks();
      mockResenaModel.findByIdAndUpdate.mockReturnValue(query);

      await service.removeLike(resenaId, userId);
      const removeCall = mockResenaModel.findByIdAndUpdate.mock.calls[0][1];
      expect(removeCall.$pull).toBeDefined();
      expect(removeCall.$addToSet).toBeUndefined();
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete resena and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'r1' });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('r1');

      expect(mockResenaModel.findByIdAndDelete).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when resena is not found', async () => {
      const query = createMockQuery(null);
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Reseña no encontrada');
    });
  });
});
