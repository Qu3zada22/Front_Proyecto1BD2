import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MenuItemsService } from './menu-items.service';
import { MenuItem } from './schemas/menu-item.schema';
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

const mockRestauranteModel = {
  countDocuments: jest.fn(),
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('MenuItemsService', () => {
  let service: MenuItemsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRestauranteModel.countDocuments.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuItemsService,
        {
          provide: getModelToken(MenuItem.name),
          useValue: mockModel,
        },
        {
          provide: getModelToken(Restaurante.name),
          useValue: mockRestauranteModel,
        },
      ],
    }).compile();

    service = module.get<MenuItemsService>(MenuItemsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call model.create with dto and return created item', async () => {
      const dto = {
        restaurante_id: new Types.ObjectId().toString(),
        nombre: 'Burger',
        precio: 45,
        categoria: 'principal' as const,
        etiquetas: [],
        disponible: true,
      };
      const created = { _id: 'item1', ...dto };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurante_id: expect.any(Types.ObjectId),
          nombre: 'Burger',
          precio: 45,
          categoria: 'principal',
        }),
      );
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException when restaurante_id does not exist', async () => {
      mockRestauranteModel.countDocuments.mockResolvedValue(0);
      const dto = {
        restaurante_id: new Types.ObjectId().toString(),
        nombre: 'Burger',
        precio: 45,
        categoria: 'principal' as const,
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dto as any)).rejects.toThrow(
        'El restaurante referenciado no existe o está inactivo',
      );
      expect(mockModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when restaurante is inactive (activo: false)', async () => {
      mockRestauranteModel.countDocuments.mockResolvedValue(0);
      const dto = {
        restaurante_id: new Types.ObjectId().toString(),
        nombre: 'Burger',
        precio: 45,
        categoria: 'principal' as const,
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dto as any)).rejects.toThrow(
        'El restaurante referenciado no existe o está inactivo',
      );
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should NOT add disponible filter by default when not specified', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({});

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.disponible).toBeUndefined();
    });

    it('should allow overriding disponible to false', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ disponible: false });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.disponible).toBe(false);
    });

    it('should return items with default sort/skip/limit when no filters given', async () => {
      const items = [{ nombre: 'Item1' }];
      const query = createMockQuery(items);
      mockModel.find.mockReturnValue(query);

      const result = await service.findAll({});

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(query.sort).toHaveBeenCalledWith({ categoria: 1, nombre: 1 });
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(50);
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(items);
    });

    it('should filter by restaurante_id converting to ObjectId', async () => {
      const restauranteId = '507f1f77bcf86cd799439011';
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ restaurante_id: restauranteId });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.restaurante_id.toString()).toBe(restauranteId);
    });

    it('should filter by categoria', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ categoria: 'postre' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: 'postre' }),
      );
    });

    it('should filter by etiqueta using etiquetas field', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ etiqueta: 'vegano' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ etiquetas: 'vegano' }),
      );
    });

    it('should apply custom skip and limit', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ skip: 10, limit: 5 });

      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.limit).toHaveBeenCalledWith(5);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the menu item when found', async () => {
      const doc = { _id: 'item1', nombre: 'Burger' };
      const query = createMockQuery(doc);
      mockModel.findById.mockReturnValue(query);

      const result = await service.findOne('item1');

      expect(mockModel.findById).toHaveBeenCalledWith('item1');
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when item is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findById.mockReturnValue(query);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Item no encontrado',
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call findByIdAndUpdate with $set operator and return updated item', async () => {
      const updated = { _id: 'item1', precio: 50 };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.update('item1', { precio: 50 } as any);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'item1',
        { $set: { precio: 50 } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when item to update is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.update('nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('nonexistent', {} as any)).rejects.toThrow(
        'Item no encontrado',
      );
    });
  });

  // ── updateMany ───────────────────────────────────────────────────────────────

  describe('updateMany', () => {
    it('should update all items for a restaurant with $set operator', async () => {
      const restauranteId = '507f1f77bcf86cd799439011';
      const execResult = { modifiedCount: 5 };
      const query = createMockQuery(execResult);
      mockModel.updateMany.mockReturnValue(query);

      const result = await service.updateMany(restauranteId, {
        disponible: false,
      } as any);

      const callArgs = mockModel.updateMany.mock.calls[0];
      expect(callArgs[0].restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArgs[0].restaurante_id.toString()).toBe(restauranteId);
      expect(callArgs[1]).toEqual({ $set: { disponible: false } });
      expect(result).toEqual({ modifiedCount: 5 });
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete item and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'item1' });
      mockModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('item1');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('item1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when item to delete is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('nonexistent')).rejects.toThrow(
        'Item no encontrado',
      );
    });
  });

  // ── removeByRestaurant ───────────────────────────────────────────────────────

  describe('removeByRestaurant', () => {
    it('should delete all items for a restaurant and return deleted count', async () => {
      const restauranteId = '507f1f77bcf86cd799439011';
      const execResult = { deletedCount: 8 };
      const query = createMockQuery(execResult);
      mockModel.deleteMany.mockReturnValue(query);

      const result = await service.removeByRestaurant(restauranteId);

      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        restaurante_id: new Types.ObjectId(restauranteId),
      });
      expect(result).toEqual({ deleted: 8 });
    });
  });

  // ── addTag ($addToSet) ───────────────────────────────────────────────────────

  describe('addTag', () => {
    it('should use $addToSet operator to add tag without duplicates', async () => {
      const updated = { _id: 'item1', etiquetas: ['vegano', 'sin-gluten'] };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.addTag('item1', 'sin-gluten');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'item1',
        { $addToSet: { etiquetas: 'sin-gluten' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when item is not found on addTag', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.addTag('nonexistent', 'vegano')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addTag('nonexistent', 'vegano')).rejects.toThrow(
        'Item no encontrado',
      );
    });
  });

  // ── removeTag ($pull) ────────────────────────────────────────────────────────

  describe('removeTag', () => {
    it('should use $pull operator to remove tag from array', async () => {
      const updated = { _id: 'item1', etiquetas: ['vegano'] };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.removeTag('item1', 'sin-gluten');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'item1',
        { $pull: { etiquetas: 'sin-gluten' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when item is not found on removeTag', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.removeTag('nonexistent', 'vegano')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeTag('nonexistent', 'vegano')).rejects.toThrow(
        'Item no encontrado',
      );
    });
  });
});
