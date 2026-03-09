import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ResenasService } from './resenas.service';
import { Resena } from './schemas/resena.schema';

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

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ResenasService', () => {
  let service: ResenasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResenasService,
        {
          provide: getModelToken(Resena.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<ResenasService>(ResenasService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call model.create with the provided data and return the result', async () => {
      const data = {
        cliente_id: new Types.ObjectId().toString(),
        restaurante_id: new Types.ObjectId().toString(),
        calificacion: 5,
        comentario: 'Excelente!',
      };
      const created = { _id: 'r1', ...data };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(created);
    });
  });

  // ── findByRestaurant ─────────────────────────────────────────────────────────

  describe('findByRestaurant', () => {
    const restauranteId = '507f1f77bcf86cd799439011';

    it('should filter by restaurante_id as ObjectId', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.restaurante_id).toBeInstanceOf(Types.ObjectId);
      expect(callArg.restaurante_id.toString()).toBe(restauranteId);
    });

    it('should populate cliente_id with only the nombre field', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.populate).toHaveBeenCalledWith('cliente_id', 'nombre');
    });

    it('should use default sort by calificacion descending when sort is omitted', async () => {
      const resenas = [{ calificacion: 5 }, { calificacion: 4 }];
      const query = createMockQuery(resenas);
      mockModel.find.mockReturnValue(query);

      const result = await service.findByRestaurant(restauranteId);

      expect(query.sort).toHaveBeenCalledWith({ calificacion: -1 });
      expect(result).toEqual(resenas);
    });

    it('should sort by calificacion descending when sort="calificacion"', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'calificacion');

      expect(query.sort).toHaveBeenCalledWith({ calificacion: -1 });
    });

    it('should sort by createdAt descending when sort="fecha"', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'fecha');

      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should apply default skip=0 and limit=10', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(10);
    });

    it('should apply custom skip and limit', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId, 'calificacion', 5, 20);

      expect(query.skip).toHaveBeenCalledWith(5);
      expect(query.limit).toHaveBeenCalledWith(20);
    });

    it('should call lean and exec', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findByRestaurant(restauranteId);

      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete resena and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'r1' });
      mockModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('r1');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when resena is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Reseña no encontrada');
    });
  });
});
