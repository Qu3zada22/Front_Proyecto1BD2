import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

const mockAggregateChain = {
  session: jest.fn().mockResolvedValue([{ avg: 4.5, count: 10 }]),
};

const mockResenaModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn().mockReturnValue(mockAggregateChain),
};

const mockRestauranteModel = {
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn(),
};

const mockOrdenModel = {
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ResenasService', () => {
  let service: ResenasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection.startSession.mockResolvedValue(mockSession);
    mockRestauranteModel.findByIdAndUpdate.mockResolvedValue({});
    mockOrdenModel.findByIdAndUpdate.mockResolvedValue({});
    mockRestauranteModel.countDocuments.mockResolvedValue(1);
    mockOrdenModel.countDocuments.mockResolvedValue(1);
    mockAggregateChain.session.mockResolvedValue([{ avg: 4.5, count: 10 }]);
    mockResenaModel.aggregate.mockReturnValue(mockAggregateChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResenasService,
        { provide: getModelToken(Resena.name), useValue: mockResenaModel },
        { provide: getModelToken(Restaurante.name), useValue: mockRestauranteModel },
        { provide: getModelToken(Orden.name), useValue: mockOrdenModel },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<ResenasService>(ResenasService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const restauranteId = new Types.ObjectId().toString();
    const ordenId = new Types.ObjectId().toString();

    it('should start a transaction and commit on success', async () => {
      const data = { usuario_id: new Types.ObjectId().toString(), restaurante_id: restauranteId, calificacion: 5 };
      const created = { _id: 'r1', ...data };
      mockResenaModel.create.mockResolvedValue([created]);

      await service.create(data);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should call model.create with array syntax and session for ACID transaction', async () => {
      const data = { usuario_id: new Types.ObjectId().toString(), restaurante_id: restauranteId, calificacion: 5 };
      const created = { _id: 'r1', ...data };
      mockResenaModel.create.mockResolvedValue([created]);

      const result = await service.create(data);

      expect(mockResenaModel.create).toHaveBeenCalledWith([data], { session: mockSession });
      expect(result).toEqual(created);
    });

    it('should update calificacion_prom and total_resenas on the restaurante after create', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, calificacion: 4 };
      mockResenaModel.create.mockResolvedValue([{ _id: 'r1', ...data }]);
      mockAggregateChain.session.mockResolvedValue([{ avg: 4.2, count: 10 }]);

      await service.create(data);

      expect(mockResenaModel.aggregate).toHaveBeenCalled();
      expect(mockRestauranteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        restauranteId,
        expect.objectContaining({ $set: expect.objectContaining({ calificacion_prom: 4.2, total_resenas: 10 }) }),
        { session: mockSession },
      );
    });

    it('should update tiene_resena on the orden when orden_id is provided', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, orden_id: ordenId, calificacion: 5 };
      mockResenaModel.create.mockResolvedValue([{ _id: 'r1', ...data }]);

      await service.create(data);

      expect(mockOrdenModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ordenId,
        { $set: { tiene_resena: true } },
        { session: mockSession },
      );
    });

    it('should NOT update restaurante when restaurante_id is absent', async () => {
      const data = { usuario_id: 'u1', calificacion: 3 };
      mockResenaModel.create.mockResolvedValue([{ _id: 'r1', ...data }]);

      await service.create(data);

      expect(mockRestauranteModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should NOT update orden when orden_id is absent', async () => {
      const data = { usuario_id: 'u1', restaurante_id: restauranteId, calificacion: 3 };
      mockResenaModel.create.mockResolvedValue([{ _id: 'r1', ...data }]);

      await service.create(data);

      expect(mockOrdenModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should abort transaction and rethrow on error', async () => {
      mockResenaModel.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create({ usuario_id: 'u1', calificacion: 3 })).rejects.toThrow('DB error');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should always call endSession even when an error occurs', async () => {
      mockResenaModel.create.mockRejectedValue(new Error('failure'));

      try { await service.create({ usuario_id: 'u1' }); } catch { /* expected */ }

      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw BadRequestException when restaurante_id does not exist', async () => {
      mockRestauranteModel.countDocuments.mockResolvedValue(0);
      const data = { usuario_id: 'u1', restaurante_id: new Types.ObjectId().toString(), calificacion: 5 };

      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('El restaurante referenciado no existe');
      expect(mockResenaModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when orden_id does not exist', async () => {
      mockOrdenModel.countDocuments.mockResolvedValue(0);
      const data = { usuario_id: 'u1', restaurante_id: new Types.ObjectId().toString(), orden_id: new Types.ObjectId().toString(), calificacion: 5 };

      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('La orden referenciada no existe');
      expect(mockResenaModel.create).not.toHaveBeenCalled();
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
    const restauranteOid = new Types.ObjectId();
    const ordenOid = new Types.ObjectId();

    it('should delete resena inside ACID transaction and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'r1', restaurante_id: restauranteOid, orden_id: ordenOid });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);
      mockAggregateChain.session.mockResolvedValue([{ avg: 4.0, count: 9 }]);

      const result = await service.remove('r1');

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockResenaModel.findByIdAndDelete).toHaveBeenCalledWith('r1', { session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it('should recalculate calificacion_prom and total_resenas on restaurante after delete', async () => {
      const query = createMockQuery({ _id: 'r1', restaurante_id: restauranteOid });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);
      mockAggregateChain.session.mockResolvedValue([{ avg: 3.5, count: 4 }]);

      await service.remove('r1');

      expect(mockResenaModel.aggregate).toHaveBeenCalled();
      expect(mockRestauranteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        restauranteOid,
        { $set: { calificacion_prom: 3.5, total_resenas: 4 } },
        { session: mockSession },
      );
    });

    it('should reset calificacion_prom to 0 when no reviews remain', async () => {
      const query = createMockQuery({ _id: 'r1', restaurante_id: restauranteOid });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);
      mockAggregateChain.session.mockResolvedValue([]);

      await service.remove('r1');

      expect(mockRestauranteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        restauranteOid,
        { $set: { calificacion_prom: 0, total_resenas: 0 } },
        { session: mockSession },
      );
    });

    it('should reset tiene_resena to false on the orden after delete', async () => {
      const query = createMockQuery({ _id: 'r1', orden_id: ordenOid });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);

      await service.remove('r1');

      expect(mockOrdenModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ordenOid,
        { $set: { tiene_resena: false } },
        { session: mockSession },
      );
    });

    it('should NOT update restaurante when resena had no restaurante_id', async () => {
      const query = createMockQuery({ _id: 'r1' });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);

      await service.remove('r1');

      expect(mockRestauranteModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should NOT update orden when resena had no orden_id', async () => {
      const query = createMockQuery({ _id: 'r1', restaurante_id: restauranteOid });
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);
      mockAggregateChain.session.mockResolvedValue([{ avg: 4.0, count: 5 }]);

      await service.remove('r1');

      expect(mockOrdenModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when resena is not found', async () => {
      const query = createMockQuery(null);
      mockResenaModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Reseña no encontrada');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should abort transaction and endSession on error', async () => {
      mockResenaModel.findByIdAndDelete.mockImplementation(() => { throw new Error('DB error'); });

      try { await service.remove('r1'); } catch { /* expected */ }

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
