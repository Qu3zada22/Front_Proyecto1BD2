import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { SeedService } from './seed.service';

// ── mock GridFSBucket ─────────────────────────────────────────────────────────

jest.mock('mongodb', () => {
  const actual = jest.requireActual('mongodb');
  return {
    ...actual,
    GridFSBucket: jest.fn().mockImplementation(() => ({
      drop: jest.fn().mockResolvedValue(undefined),
    })),
  };
});
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Resena } from '../resenas/schemas/resena.schema';

// ── mock child_process.spawn ──────────────────────────────────────────────────

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

function makeChildProcess(exitCode: number) {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  // Emit close asynchronously so listeners can be registered first
  setImmediate(() => child.emit('close', exitCode));
  return child;
}

// ── mock models ───────────────────────────────────────────────────────────────

function makeModel(count: number) {
  return {
    countDocuments: jest.fn().mockResolvedValue(count),
    // clearAll calls deleteMany({}) directly (no .exec()), so it must return a Promise
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: count }),
  };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('SeedService', () => {
  let service: SeedService;
  let usuarioModel: ReturnType<typeof makeModel>;
  let restauranteModel: ReturnType<typeof makeModel>;
  let menuItemModel: ReturnType<typeof makeModel>;
  let ordenModel: ReturnType<typeof makeModel>;
  let resenaModel: ReturnType<typeof makeModel>;

  beforeEach(async () => {
    jest.clearAllMocks();

    usuarioModel = makeModel(15);
    restauranteModel = makeModel(8);
    menuItemModel = makeModel(72);
    ordenModel = makeModel(50000);
    resenaModel = makeModel(6880);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
        {
          provide: getModelToken(Restaurante.name),
          useValue: restauranteModel,
        },
        { provide: getModelToken(MenuItem.name), useValue: menuItemModel },
        { provide: getModelToken(Orden.name), useValue: ordenModel },
        { provide: getModelToken(Resena.name), useValue: resenaModel },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue('mongodb://localhost:27017/fastpochi'),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: { db: { databaseName: 'fastpochi' } },
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  // ── clearAll ──────────────────────────────────────────────────────────────

  describe('clearAll', () => {
    it('should call deleteMany({}) on all five collections', async () => {
      mockSpawn.mockReturnValue(makeChildProcess(0));

      await service.clearAll();

      expect(usuarioModel.deleteMany).toHaveBeenCalledWith({});
      expect(restauranteModel.deleteMany).toHaveBeenCalledWith({});
      expect(menuItemModel.deleteMany).toHaveBeenCalledWith({});
      expect(ordenModel.deleteMany).toHaveBeenCalledWith({});
      expect(resenaModel.deleteMany).toHaveBeenCalledWith({});
    });

    it('should run all deletes in parallel via Promise.all', async () => {
      const order: string[] = [];
      const delay = (ms: number, label: string) =>
        new Promise<void>((res) =>
          setTimeout(() => {
            order.push(label);
            res();
          }, ms),
        );

      usuarioModel.deleteMany.mockReturnValue(delay(10, 'usuarios'));
      restauranteModel.deleteMany.mockReturnValue(delay(5, 'restaurantes'));
      menuItemModel.deleteMany.mockReturnValue(delay(1, 'menu_items'));
      ordenModel.deleteMany.mockReturnValue(delay(3, 'ordenes'));
      resenaModel.deleteMany.mockReturnValue(delay(2, 'resenas'));

      await service.clearAll();

      // All five completed (parallel)
      expect(order).toHaveLength(5);
      expect(order).toContain('usuarios');
      expect(order).toContain('restaurantes');
    });
  });

  // ── run (ingest + counts) ─────────────────────────────────────────────────

  describe('run', () => {
    it('should return message and collection counts when ingest exits with code 0', async () => {
      mockSpawn.mockReturnValue(makeChildProcess(0));

      const result = await service.run();

      expect(result.message).toBe('Seed completado exitosamente');
      expect(result.counts).toEqual({
        usuarios: 15,
        restaurantes: 8,
        menuItems: 72,
        ordenes: 50000,
        resenas: 6880,
      });
    });

    it('should call countDocuments on all five models after ingest', async () => {
      mockSpawn.mockReturnValue(makeChildProcess(0));

      await service.run();

      expect(usuarioModel.countDocuments).toHaveBeenCalled();
      expect(restauranteModel.countDocuments).toHaveBeenCalled();
      expect(menuItemModel.countDocuments).toHaveBeenCalled();
      expect(ordenModel.countDocuments).toHaveBeenCalled();
      expect(resenaModel.countDocuments).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when ingest script exits with non-zero code', async () => {
      // Each service.run() call spawns a new child, so return a fresh one each time
      mockSpawn.mockImplementation(() => makeChildProcess(1));

      await expect(service.run()).rejects.toThrow(InternalServerErrorException);
    });

    it('should spawn with MONGODB_URI env variable set from config', async () => {
      mockSpawn.mockReturnValue(makeChildProcess(0));

      await service.run();

      const [, , spawnOptions] = mockSpawn.mock.calls[0];
      expect(spawnOptions?.env?.MONGODB_URI).toBe(
        'mongodb://localhost:27017/fastpochi',
      );
    });
  });
});
