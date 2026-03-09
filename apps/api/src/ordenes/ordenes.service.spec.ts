import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, InjectConnection } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdenesService } from './ordenes.service';
import { Orden } from './schemas/orden.schema';

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

// ── suite ─────────────────────────────────────────────────────────────────────

describe('OrdenesService', () => {
  let service: OrdenesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesService,
        {
          provide: getModelToken(Orden.name),
          useValue: mockModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<OrdenesService>(OrdenesService);
  });

  // ── create (transaction) ─────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      usuario_id: '507f1f77bcf86cd799439011',
      restaurante_id: '507f1f77bcf86cd799439012',
      items: [
        { menu_item_id: 'mi1', nombre: 'Burger', precio: 45, cantidad: 2 },
        { menu_item_id: 'mi2', nombre: 'Fries', precio: 20, cantidad: 1 },
      ],
      direccion_entrega: { calle: '4a Ave', ciudad: 'Guatemala', pais: 'GT' },
    };

    it('should start a transaction and commit on success', async () => {
      const expectedTotal = 45 * 2 + 20 * 1; // 110
      const created = { _id: 'orden1', total: expectedTotal };
      mockModel.create.mockResolvedValue([created]);

      const result = await service.create(baseDto as any);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockModel.create).toHaveBeenCalledWith(
        [expect.objectContaining({ total: expectedTotal })],
        { session: mockSession },
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should calculate total correctly from items (precio * cantidad)', async () => {
      const created = { _id: 'orden1', total: 110 };
      mockModel.create.mockResolvedValue([created]);

      await service.create(baseDto as any);

      const createCall = mockModel.create.mock.calls[0][0][0];
      expect(createCall.total).toBe(110); // 45*2 + 20*1
    });

    it('should abort transaction and throw BadRequestException on error', async () => {
      mockModel.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('Error al crear la orden');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should always call endSession even when an error occurs', async () => {
      mockModel.create.mockRejectedValue(new Error('DB failure'));

      try {
        await service.create(baseDto as any);
      } catch {
        // expected
      }

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return orders with populated fields and default pagination', async () => {
      const ordenes = [{ _id: 'o1' }, { _id: 'o2' }];
      const query = createMockQuery(ordenes);
      mockModel.find.mockReturnValue(query);

      const result = await service.findAll({});

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(query.populate).toHaveBeenCalledWith('usuario_id', 'nombre email');
      expect(query.populate).toHaveBeenCalledWith('restaurante_id', 'nombre direccion');
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(20);
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(ordenes);
    });

    it('should filter by cliente_id converting to ObjectId using usuario_id field', async () => {
      const clienteId = '507f1f77bcf86cd799439011';
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ cliente_id: clienteId });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.usuario_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.usuario_id.toString()).toBe(clienteId);
    });

    it('should filter by restaurante_id converting to ObjectId', async () => {
      const restauranteId = '507f1f77bcf86cd799439012';
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ restaurante_id: restauranteId });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.restaurante_id.toString()).toBe(restauranteId);
    });

    it('should filter by estado', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ estado: 'entregado' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'entregado' }),
      );
    });

    it('should apply custom skip and limit', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ skip: 5, limit: 10 });

      expect(query.skip).toHaveBeenCalledWith(5);
      expect(query.limit).toHaveBeenCalledWith(10);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the orden with populated fields when found', async () => {
      const doc = { _id: 'o1', estado: 'pendiente' };
      const query = createMockQuery(doc);
      mockModel.findById.mockReturnValue(query);

      const result = await service.findOne('o1');

      expect(mockModel.findById).toHaveBeenCalledWith('o1');
      expect(query.populate).toHaveBeenCalledWith('usuario_id', 'nombre email telefono');
      expect(query.populate).toHaveBeenCalledWith('restaurante_id', 'nombre telefono direccion');
      expect(query.lean).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when orden is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findById.mockReturnValue(query);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Orden no encontrada');
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should update status with $set operator and return updated orden', async () => {
      const updated = { _id: 'o1', estado: 'confirmado' };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.updateStatus('o1', 'confirmado');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'o1',
        { $set: { estado: 'confirmado' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should accept all valid estado values', async () => {
      const validStates = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'];

      for (const estado of validStates) {
        const query = createMockQuery({ _id: 'o1', estado });
        mockModel.findByIdAndUpdate.mockReturnValue(query);

        const result = await service.updateStatus('o1', estado);
        expect(result).toEqual({ _id: 'o1', estado });
      }
    });

    it('should throw BadRequestException for invalid estado value', async () => {
      await expect(service.updateStatus('o1', 'invalid_state')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateStatus('o1', 'invalid_state')).rejects.toThrow('Estado inválido');
    });

    it('should throw NotFoundException when orden to update is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.updateStatus('nonexistent', 'confirmado')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStatus('nonexistent', 'confirmado')).rejects.toThrow(
        'Orden no encontrada',
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete orden and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'o1' });
      mockModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('o1');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('o1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when orden to delete is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Orden no encontrada');
    });
  });

  // ── removeMany ───────────────────────────────────────────────────────────────

  describe('removeMany', () => {
    it('should delete multiple ordenes by ids and return deleted count', async () => {
      const ids = ['o1', 'o2', 'o3'];
      const execResult = { deletedCount: 3 };
      const query = createMockQuery(execResult);
      mockModel.deleteMany.mockReturnValue(query);

      const result = await service.removeMany(ids);

      expect(mockModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
      expect(result).toEqual({ deleted: 3 });
    });

    it('should return deleted: 0 when no ordenes matched', async () => {
      const execResult = { deletedCount: 0 };
      const query = createMockQuery(execResult);
      mockModel.deleteMany.mockReturnValue(query);

      const result = await service.removeMany(['nonexistent']);

      expect(result).toEqual({ deleted: 0 });
    });
  });
});
