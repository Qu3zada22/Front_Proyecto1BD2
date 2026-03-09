import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdenesService } from './ordenes.service';
import { Orden } from './schemas/orden.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';

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

const mockOrdenModel = {
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
  find: jest.fn(),
  bulkWrite: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('OrdenesService', () => {
  let service: OrdenesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: ambos items del baseDto están disponibles
    mockMenuItemModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: '507f1f77bcf86cd799439031' },
        { _id: '507f1f77bcf86cd799439032' },
      ]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesService,
        {
          provide: getModelToken(Orden.name),
          useValue: mockOrdenModel,
        },
        {
          provide: getModelToken(MenuItem.name),
          useValue: mockMenuItemModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<OrdenesService>(OrdenesService);
  });

  // ── create (ACID transaction + bulkWrite) ────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      usuario_id: '507f1f77bcf86cd799439011',
      restaurante_id: '507f1f77bcf86cd799439012',
      items: [
        { menu_item_id: '507f1f77bcf86cd799439031', nombre: 'Burger', precio: 45, cantidad: 2 },
        { menu_item_id: '507f1f77bcf86cd799439032', nombre: 'Fries', precio: 20, cantidad: 1 },
      ],
      direccion_entrega: { calle: '4a Ave', ciudad: 'Guatemala', pais: 'GT' },
    };

    it('should start a transaction and commit on success', async () => {
      const expectedTotal = 45 * 2 + 20 * 1; // 110
      const created = { _id: 'orden1', total: expectedTotal };
      mockOrdenModel.create.mockResolvedValue([created]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

      const result = await service.create(baseDto as any);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockOrdenModel.create).toHaveBeenCalledWith(
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
      mockOrdenModel.create.mockResolvedValue([created]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      const createCall = mockOrdenModel.create.mock.calls[0][0][0];
      expect(createCall.total).toBe(110); // 45*2 + 20*1
    });

    it('should call bulkWrite to $inc veces_ordenado for each item inside the transaction', async () => {
      const created = { _id: 'orden1', total: 110 };
      mockOrdenModel.create.mockResolvedValue([created]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

      await service.create(baseDto as any);

      expect(mockMenuItemModel.bulkWrite).toHaveBeenCalledTimes(1);
      const [bulkOps] = mockMenuItemModel.bulkWrite.mock.calls[0];

      expect(bulkOps).toHaveLength(2);
      expect(bulkOps[0].updateOne.update).toEqual({ $inc: { veces_ordenado: 2 } });
      expect(bulkOps[1].updateOne.update).toEqual({ $inc: { veces_ordenado: 1 } });
    });

    it('should pass session to bulkWrite so it runs inside the ACID transaction', async () => {
      mockOrdenModel.create.mockResolvedValue([{ _id: 'o1', total: 110 }]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      const [, options] = mockMenuItemModel.bulkWrite.mock.calls[0];
      expect(options).toMatchObject({ session: mockSession });
    });

    it('should check disponible:true for all items inside the ACID session', async () => {
      mockOrdenModel.create.mockResolvedValue([{ _id: 'orden1', total: 110 }]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      expect(mockMenuItemModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ disponible: true }),
        { _id: 1 },
        { session: mockSession },
      );
    });

    it('should throw BadRequestException when an item is not disponible', async () => {
      // find returns only 1 of 2 items → one is unavailable
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: '507f1f77bcf86cd799439031' }]),
      });

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('no están disponibles');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should NOT throw when the same menu_item_id appears twice in the order (deduplication)', async () => {
      const duplicateItemDto = {
        ...baseDto,
        items: [
          { menu_item_id: '507f1f77bcf86cd799439031', nombre: 'Burger', precio: 45, cantidad: 2 },
          { menu_item_id: '507f1f77bcf86cd799439031', nombre: 'Burger', precio: 45, cantidad: 1 },
        ],
      };
      // find returns 1 unique item (deduped) — check should pass (1 === 1)
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: '507f1f77bcf86cd799439031' }]),
      });
      mockOrdenModel.create.mockResolvedValue([{ _id: 'orden1', total: 135 }]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await expect(service.create(duplicateItemDto as any)).resolves.toBeDefined();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should abort transaction and throw BadRequestException on error', async () => {
      mockOrdenModel.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('Error al crear la orden');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should always call endSession even when an error occurs', async () => {
      mockOrdenModel.create.mockRejectedValue(new Error('DB failure'));

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
      mockOrdenModel.find.mockReturnValue(query);

      const result = await service.findAll({});

      expect(mockOrdenModel.find).toHaveBeenCalledWith({});
      expect(query.populate).toHaveBeenCalledWith('usuario_id', 'nombre email');
      expect(query.populate).toHaveBeenCalledWith('restaurante_id', 'nombre direccion');
      expect(query.sort).toHaveBeenCalledWith({ fecha_creacion: -1 });
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(20);
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(ordenes);
    });

    it('should filter by cliente_id converting to ObjectId using usuario_id field', async () => {
      const clienteId = '507f1f77bcf86cd799439011';
      const query = createMockQuery([]);
      mockOrdenModel.find.mockReturnValue(query);

      await service.findAll({ cliente_id: clienteId });

      const callArg = mockOrdenModel.find.mock.calls[0][0];
      expect(callArg.usuario_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.usuario_id.toString()).toBe(clienteId);
    });

    it('should filter by restaurante_id converting to ObjectId', async () => {
      const restauranteId = '507f1f77bcf86cd799439012';
      const query = createMockQuery([]);
      mockOrdenModel.find.mockReturnValue(query);

      await service.findAll({ restaurante_id: restauranteId });

      const callArg = mockOrdenModel.find.mock.calls[0][0];
      expect(callArg.restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.restaurante_id.toString()).toBe(restauranteId);
    });

    it('should filter by estado', async () => {
      const query = createMockQuery([]);
      mockOrdenModel.find.mockReturnValue(query);

      await service.findAll({ estado: 'entregado' });

      expect(mockOrdenModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'entregado' }),
      );
    });

    it('should apply custom skip and limit', async () => {
      const query = createMockQuery([]);
      mockOrdenModel.find.mockReturnValue(query);

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
      mockOrdenModel.findById.mockReturnValue(query);

      const result = await service.findOne('o1');

      expect(mockOrdenModel.findById).toHaveBeenCalledWith('o1');
      expect(query.populate).toHaveBeenCalledWith('usuario_id', 'nombre email telefono');
      expect(query.populate).toHaveBeenCalledWith('restaurante_id', 'nombre telefono direccion');
      expect(query.lean).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when orden is not found', async () => {
      const query = createMockQuery(null);
      mockOrdenModel.findById.mockReturnValue(query);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Orden no encontrada');
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should update with $set estado AND $push to historial_estados with $slice:-5', async () => {
      const updated = { _id: 'o1', estado: 'en_proceso' };
      const query = createMockQuery(updated);
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.updateStatus('o1', 'en_proceso');

      const [id, update, opts] = mockOrdenModel.findByIdAndUpdate.mock.calls[0];
      expect(id).toBe('o1');
      expect(update.$set.estado).toBe('en_proceso');
      // $each + $slice:-5 para mantener array acotado en máximo 5 entradas (diseño)
      expect(update.$push.historial_estados.$each[0]).toMatchObject({ estado: 'en_proceso' });
      expect(update.$push.historial_estados.$each[0].timestamp).toBeInstanceOf(Date);
      expect(update.$push.historial_estados.$slice).toBe(-5);
      expect(opts).toEqual({ new: true });
      expect(result).toEqual(updated);
    });

    it('should set fecha_entrega_real when estado is "entregado"', async () => {
      const query = createMockQuery({ _id: 'o1', estado: 'entregado' });
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'entregado');

      const [, update] = mockOrdenModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$set.fecha_entrega_real).toBeInstanceOf(Date);
    });

    it('should NOT set fecha_entrega_real for non-entregado states', async () => {
      const query = createMockQuery({ _id: 'o1', estado: 'en_camino' });
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'en_camino');

      const [, update] = mockOrdenModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$set.fecha_entrega_real).toBeUndefined();
    });

    it('should include actor_id in historial entry when provided', async () => {
      const actorId = '507f1f77bcf86cd799439099';
      const query = createMockQuery({ _id: 'o1', estado: 'en_proceso' });
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'en_proceso', actorId);

      const [, update] = mockOrdenModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$push.historial_estados.$each[0].actor_id).toBeInstanceOf(Types.ObjectId);
      expect(update.$push.historial_estados.$each[0].actor_id.toString()).toBe(actorId);
    });

    it('should include nota in historial entry when provided', async () => {
      const query = createMockQuery({ _id: 'o1', estado: 'cancelado' });
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'cancelado', undefined, 'Cliente canceló');

      const [, update] = mockOrdenModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$push.historial_estados.$each[0].nota).toBe('Cliente canceló');
    });

    it('should accept all valid estado values including en_proceso', async () => {
      const validStates = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];

      for (const estado of validStates) {
        jest.clearAllMocks();
        const query = createMockQuery({ _id: 'o1', estado });
        mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

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
      mockOrdenModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.updateStatus('nonexistent', 'en_proceso')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStatus('nonexistent', 'en_proceso')).rejects.toThrow(
        'Orden no encontrada',
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete orden and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'o1' });
      mockOrdenModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('o1');

      expect(mockOrdenModel.findByIdAndDelete).toHaveBeenCalledWith('o1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when orden to delete is not found', async () => {
      const query = createMockQuery(null);
      mockOrdenModel.findByIdAndDelete.mockReturnValue(query);

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
      mockOrdenModel.deleteMany.mockReturnValue(query);

      const result = await service.removeMany(ids);

      expect(mockOrdenModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
      expect(result).toEqual({ deleted: 3 });
    });

    it('should return deleted: 0 when no ordenes matched', async () => {
      const execResult = { deletedCount: 0 };
      const query = createMockQuery(execResult);
      mockOrdenModel.deleteMany.mockReturnValue(query);

      const result = await service.removeMany(['nonexistent']);

      expect(result).toEqual({ deleted: 0 });
    });
  });
});
