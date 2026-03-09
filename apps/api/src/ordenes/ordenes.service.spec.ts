import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdenesService } from './ordenes.service';
import { Orden } from './schemas/orden.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';

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
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
  aggregate: jest.fn(),
  distinct: jest.fn(),
  countDocuments: jest.fn(),
};

const mockMenuItemModel = {
  find: jest.fn(),
  bulkWrite: jest.fn(),
  countDocuments: jest.fn(),
};

const mockUsuarioModel = {
  countDocuments: jest.fn(),
};

const mockRestauranteModel = {
  countDocuments: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('OrdenesService', () => {
  let service: OrdenesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: ambos items del baseDto están disponibles (con nombre y precio de BD)
    mockMenuItemModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger', precio: 45 },
        { _id: new Types.ObjectId('507f1f77bcf86cd799439032'), nombre: 'Fries', precio: 20 },
      ]),
    });
    // Default: FK validation pasa
    mockUsuarioModel.countDocuments.mockResolvedValue(1);
    mockRestauranteModel.countDocuments.mockResolvedValue(1);

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
          provide: getModelToken(Usuario.name),
          useValue: mockUsuarioModel,
        },
        {
          provide: getModelToken(Restaurante.name),
          useValue: mockRestauranteModel,
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

    it('should check disponible:true and restaurante_id for all items inside the ACID session', async () => {
      mockOrdenModel.create.mockResolvedValue([{ _id: 'orden1', total: 110 }]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      expect(mockMenuItemModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ disponible: true, restaurante_id: expect.anything() }),
        { _id: 1, nombre: 1, precio: 1 },
        { session: mockSession },
      );
    });

    it('should throw BadRequestException when an item is not disponible', async () => {
      // find returns only 1 of 2 items → one is unavailable
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger', precio: 45 }]),
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
      // find returns 1 unique item (deduped) with nombre+precio — check should pass (1 === 1)
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger', precio: 45 }]),
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

    it('should use DB prices instead of DTO prices (BUG-01)', async () => {
      // DB returns different prices than DTO
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger Real', precio: 50 },
          { _id: new Types.ObjectId('507f1f77bcf86cd799439032'), nombre: 'Fries Real', precio: 25 },
        ]),
      });
      const created = { _id: 'orden1', total: 125 };
      mockOrdenModel.create.mockResolvedValue([created]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      const createCall = mockOrdenModel.create.mock.calls[0][0][0];
      // Total recalculado: 50*2 + 25*1 = 125 (no 45*2 + 20*1 = 110)
      expect(createCall.total).toBe(125);
      expect(createCall.items[0].nombre).toBe('Burger Real');
      expect(createCall.items[0].precio_unitario).toBe(50);
      expect(createCall.items[1].nombre).toBe('Fries Real');
      expect(createCall.items[1].precio_unitario).toBe(25);
    });

    it('should throw BadRequestException when usuario_id does not exist (OBS-01 FK)', async () => {
      mockUsuarioModel.countDocuments.mockResolvedValue(0);

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('usuario referenciado no existe');
    });

    it('should throw BadRequestException when restaurante_id does not exist or is inactive (OBS-01/02 FK)', async () => {
      mockRestauranteModel.countDocuments.mockResolvedValue(0);

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('restaurante referenciado no existe o está inactivo');
    });

    it('should parse Decimal128 precio from DB correctly and compute total without NaN (BUG-01 Decimal128)', async () => {
      // Simula el objeto Decimal128 que devuelve .lean() para datos del seed
      const dec128 = (val: number) => ({ toString: () => String(val), _bsontype: 'Decimal128' });
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger', precio: dec128(45) },
          { _id: new Types.ObjectId('507f1f77bcf86cd799439032'), nombre: 'Fries',  precio: dec128(20) },
        ]),
      });
      mockOrdenModel.create.mockResolvedValue([{ _id: 'orden1', total: 110 }]);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      await service.create(baseDto as any);

      const createCall = mockOrdenModel.create.mock.calls[0][0][0];
      expect(isNaN(createCall.total)).toBe(false);
      expect(createCall.total).toBe(110); // 45*2 + 20*1
      expect(createCall.items[0].precio_unitario).toBe(45);
      expect(createCall.items[1].precio_unitario).toBe(20);
    });

    it('should throw BadRequestException when items belong to a different restaurant (OBS-01 cross-restaurant)', async () => {
      // Solo devuelve 1 de 2 items (el filtro restaurante_id excluye el otro)
      mockMenuItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId('507f1f77bcf86cd799439031'), nombre: 'Burger', precio: 45 },
        ]),
      });

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow('no pertenecen a este restaurante');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
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
      const findQuery = createMockQuery({ _id: 'o1', estado: 'pendiente' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      const updated = { _id: 'o1', estado: 'en_proceso' };
      const query = createMockQuery(updated);
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      const result = await service.updateStatus('o1', 'en_proceso');

      const [filter, update, opts] = mockOrdenModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual({ _id: 'o1', estado: 'pendiente' });
      expect(update.$set.estado).toBe('en_proceso');
      // $each + $slice:-5 para mantener array acotado en máximo 5 entradas (diseño)
      expect(update.$push.historial_estados.$each[0]).toMatchObject({ estado: 'en_proceso' });
      expect(update.$push.historial_estados.$each[0].timestamp).toBeInstanceOf(Date);
      expect(update.$push.historial_estados.$slice).toBe(-5);
      expect(opts).toEqual({ new: true });
      expect(result).toEqual(updated);
    });

    it('should set fecha_entrega_real when estado is "entregado"', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'en_camino' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      const query = createMockQuery({ _id: 'o1', estado: 'entregado' });
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'entregado');

      const [, update] = mockOrdenModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.fecha_entrega_real).toBeInstanceOf(Date);
    });

    it('should NOT set fecha_entrega_real for non-entregado states', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'en_proceso' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      const query = createMockQuery({ _id: 'o1', estado: 'en_camino' });
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'en_camino');

      const [, update] = mockOrdenModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.fecha_entrega_real).toBeUndefined();
    });

    it('should include actor_id in historial entry when provided', async () => {
      const actorId = '507f1f77bcf86cd799439099';
      const findQuery = createMockQuery({ _id: 'o1', estado: 'pendiente' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      const query = createMockQuery({ _id: 'o1', estado: 'en_proceso' });
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'en_proceso', actorId);

      const [, update] = mockOrdenModel.findOneAndUpdate.mock.calls[0];
      expect(update.$push.historial_estados.$each[0].actor_id).toBeInstanceOf(Types.ObjectId);
      expect(update.$push.historial_estados.$each[0].actor_id.toString()).toBe(actorId);
    });

    it('should include nota in historial entry when provided', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'pendiente' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      const query = createMockQuery({ _id: 'o1', estado: 'cancelado' });
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      await service.updateStatus('o1', 'cancelado', undefined, 'Cliente canceló');

      const [, update] = mockOrdenModel.findOneAndUpdate.mock.calls[0];
      expect(update.$push.historial_estados.$each[0].nota).toBe('Cliente canceló');
    });

    it('should accept valid forward transitions', async () => {
      const transitions = [
        { from: 'pendiente', to: 'en_proceso' },
        { from: 'en_proceso', to: 'en_camino' },
        { from: 'en_camino', to: 'entregado' },
        { from: 'pendiente', to: 'cancelado' },
      ];

      for (const { from, to } of transitions) {
        jest.clearAllMocks();
        const findQuery = createMockQuery({ _id: 'o1', estado: from });
        mockOrdenModel.findById.mockReturnValue(findQuery);
        const query = createMockQuery({ _id: 'o1', estado: to });
        mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

        const result = await service.updateStatus('o1', to);
        expect(result).toEqual({ _id: 'o1', estado: to });
      }
    });

    it('should throw BadRequestException for invalid estado value', async () => {
      await expect(service.updateStatus('o1', 'invalid_state')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateStatus('o1', 'invalid_state')).rejects.toThrow('Estado inválido');
    });

    it('should throw BadRequestException for invalid backward transitions', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'entregado' });
      mockOrdenModel.findById.mockReturnValue(findQuery);

      await expect(service.updateStatus('o1', 'pendiente')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus('o1', 'pendiente')).rejects.toThrow('Transición inválida');
    });

    it('should throw BadRequestException when transitioning from terminal state cancelado', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'cancelado' });
      mockOrdenModel.findById.mockReturnValue(findQuery);

      await expect(service.updateStatus('o1', 'en_proceso')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus('o1', 'en_proceso')).rejects.toThrow('Transición inválida');
    });

    it('should throw NotFoundException when orden to update is not found', async () => {
      const findQuery = createMockQuery(null);
      mockOrdenModel.findById.mockReturnValue(findQuery);

      await expect(service.updateStatus('nonexistent', 'en_proceso')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStatus('nonexistent', 'en_proceso')).rejects.toThrow(
        'Orden no encontrada',
      );
    });

    it('should throw BadRequestException when estado changed between read and write (race condition)', async () => {
      const findQuery = createMockQuery({ _id: 'o1', estado: 'pendiente' });
      mockOrdenModel.findById.mockReturnValue(findQuery);
      // findOneAndUpdate returns null → estado changed concurrently
      const query = createMockQuery(null);
      mockOrdenModel.findOneAndUpdate.mockReturnValue(query);

      await expect(service.updateStatus('o1', 'en_proceso')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus('o1', 'en_proceso')).rejects.toThrow('Conflicto');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete orden inside ACID transaction, decrement veces_ordenado via bulkWrite, and return { deleted: true }', async () => {
      const ordenDoc = {
        _id: 'o1',
        items: [
          { item_id: '507f1f77bcf86cd799439031', cantidad: 2 },
          { item_id: '507f1f77bcf86cd799439032', cantidad: 1 },
        ],
      };
      const query = createMockQuery(ordenDoc);
      mockOrdenModel.findByIdAndDelete.mockReturnValue(query);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      const result = await service.remove('o1');

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockOrdenModel.findByIdAndDelete).toHaveBeenCalledWith('o1', { session: mockSession });
      expect(mockMenuItemModel.bulkWrite).toHaveBeenCalledTimes(1);
      const [bulkOps, opts] = mockMenuItemModel.bulkWrite.mock.calls[0];
      expect(bulkOps).toHaveLength(2);
      expect(bulkOps[0].updateOne.update).toEqual({ $inc: { veces_ordenado: -2 } });
      expect(bulkOps[1].updateOne.update).toEqual({ $inc: { veces_ordenado: -1 } });
      expect(opts).toMatchObject({ session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when orden to delete is not found', async () => {
      const query = createMockQuery(null);
      mockOrdenModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Orden no encontrada');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ── removeMany ───────────────────────────────────────────────────────────────

  describe('removeMany', () => {
    it('should delete multiple ordenes inside ACID transaction, decrement veces_ordenado, and return deleted count', async () => {
      const ids = ['o1', 'o2'];
      const ordenes = [
        { _id: 'o1', items: [{ item_id: 'i1', cantidad: 3 }] },
        { _id: 'o2', items: [{ item_id: 'i2', cantidad: 1 }] },
      ];
      const findQuery = createMockQuery(ordenes);
      findQuery.session = jest.fn().mockReturnThis();
      mockOrdenModel.find.mockReturnValue(findQuery);
      const deleteQuery = createMockQuery({ deletedCount: 2 });
      deleteQuery.session = jest.fn().mockReturnThis();
      mockOrdenModel.deleteMany.mockReturnValue(deleteQuery);
      mockMenuItemModel.bulkWrite.mockResolvedValue({});

      const result = await service.removeMany(ids);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockOrdenModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
      expect(mockMenuItemModel.bulkWrite).toHaveBeenCalledTimes(1);
      const [bulkOps, opts] = mockMenuItemModel.bulkWrite.mock.calls[0];
      expect(bulkOps).toHaveLength(2);
      expect(bulkOps[0].updateOne.update).toEqual({ $inc: { veces_ordenado: -3 } });
      expect(bulkOps[1].updateOne.update).toEqual({ $inc: { veces_ordenado: -1 } });
      expect(opts).toMatchObject({ session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2 });
    });

    it('should return deleted: 0 when no ordenes matched', async () => {
      const findQuery = createMockQuery([]);
      findQuery.session = jest.fn().mockReturnThis();
      mockOrdenModel.find.mockReturnValue(findQuery);
      const execResult = { deletedCount: 0 };
      const query = createMockQuery(execResult);
      query.session = jest.fn().mockReturnThis();
      mockOrdenModel.deleteMany.mockReturnValue(query);

      const result = await service.removeMany(['nonexistent']);

      expect(result).toEqual({ deleted: 0 });
    });
  });
});
