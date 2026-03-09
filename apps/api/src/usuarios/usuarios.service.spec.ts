import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './schemas/usuario.schema';

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

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getModelToken(Usuario.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call model.create with the provided data and return the result', async () => {
      const data = {
        nombre: 'Juan Perez',
        email: 'juan@example.com',
        password: 'hashed_pw',
        rol: 'cliente',
      };
      const created = { _id: 'u1', ...data };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(created);
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const data = {
        nombre: 'Ana',
        email: '  ANA@Example.COM  ',
        password: 'pw',
        rol: 'cliente',
      };
      mockModel.create.mockResolvedValue({ _id: 'u2', ...data, email: 'ana@example.com' });

      await service.create(data);

      const callArg = mockModel.create.mock.calls[0][0];
      expect(callArg.email).toBe('ana@example.com');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return users excluding password field, sorted by fecha_registro desc', async () => {
      const users = [{ nombre: 'Juan' }, { nombre: 'Ana' }];
      const query = createMockQuery(users);
      mockModel.find.mockReturnValue(query);

      const result = await service.findAll();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(query.sort).toHaveBeenCalledWith({ fecha_registro: -1 });
      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it('should filter by rol when provided', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ rol: 'propietario' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ rol: 'propietario' }),
      );
    });

    it('should filter by email with case-insensitive regex when provided', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ email: 'juan' });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.email).toBeInstanceOf(RegExp);
      expect(callArg.email.source).toBe('juan');
      expect(callArg.email.flags).toContain('i');
    });

    it('should escape regex special characters in email filter', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ email: 'user+tag@example.com' });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.email).toBeInstanceOf(RegExp);
      expect(callArg.email.source).toBe('user\\+tag@example\\.com');
    });

    it('should filter by both rol and email simultaneously', async () => {
      const query = createMockQuery([]);
      mockModel.find.mockReturnValue(query);

      await service.findAll({ rol: 'admin', email: 'admin' });

      const callArg = mockModel.find.mock.calls[0][0];
      expect(callArg.rol).toBe('admin');
      expect(callArg.email).toBeInstanceOf(RegExp);
    });
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return user data without password when credentials are valid', async () => {
      const userWithPw = {
        _id: 'u1',
        nombre: 'Juan',
        email: 'juan@example.com',
        password: 'secret',
        activo: true,
      };
      const query = createMockQuery(userWithPw);
      mockModel.findOne.mockReturnValue(query);

      const result = await service.login('Juan@Example.com');

      // Should normalize email to lowercase+trim
      expect(mockModel.findOne).toHaveBeenCalledWith({
        email: 'juan@example.com',
        activo: true,
      });
      // password must be stripped from the returned object
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual({
        _id: 'u1',
        nombre: 'Juan',
        email: 'juan@example.com',
        activo: true,
      });
    });

    it('should trim whitespace from email before querying', async () => {
      const query = createMockQuery({ _id: 'u1', email: 'juan@example.com', activo: true });
      mockModel.findOne.mockReturnValue(query);

      await service.login('  juan@example.com  ');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        email: 'juan@example.com',
        activo: true,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findOne.mockReturnValue(query);

      await expect(service.login('nonexistent@test.com')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login('nonexistent@test.com')).rejects.toThrow(
        'Usuario no encontrado o inactivo',
      );
    });

    it('should use lean and exec on the findOne query', async () => {
      const query = createMockQuery(null);
      mockModel.findOne.mockReturnValue(query);

      try {
        await service.login('test@example.com');
      } catch {
        // expected to throw
      }

      expect(query.lean).toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled();
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return user without password when found', async () => {
      const doc = { _id: 'u1', nombre: 'Juan', email: 'juan@example.com' };
      const query = createMockQuery(doc);
      mockModel.findById.mockReturnValue(query);

      const result = await service.findOne('u1');

      expect(mockModel.findById).toHaveBeenCalledWith('u1');
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(query.lean).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findById.mockReturnValue(query);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call findByIdAndUpdate with $set operator, exclude password, return updated', async () => {
      const updated = { _id: 'u1', nombre: 'Juan Updated' };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.update('u1', { nombre: 'Juan Updated' });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { $set: { nombre: 'Juan Updated' } },
        { new: true },
      );
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when user to update is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent', {})).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete user and return { deleted: true }', async () => {
      const query = createMockQuery({ _id: 'u1' });
      mockModel.findByIdAndDelete.mockReturnValue(query);

      const result = await service.remove('u1');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when user to delete is not found', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndDelete.mockReturnValue(query);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ── findByEmail ──────────────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('should find user by exact email, excluding password', async () => {
      const doc = { _id: 'u1', email: 'juan@example.com' };
      const query = createMockQuery(doc);
      mockModel.findOne.mockReturnValue(query);

      const result = await service.findByEmail('juan@example.com');

      expect(mockModel.findOne).toHaveBeenCalledWith({ email: 'juan@example.com' });
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(query.lean).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when no user with that email exists', async () => {
      const query = createMockQuery(null);
      mockModel.findOne.mockReturnValue(query);

      await expect(service.findByEmail('noone@example.com')).rejects.toThrow(NotFoundException);
      await expect(service.findByEmail('noone@example.com')).rejects.toThrow(
        'Usuario no encontrado',
      );
    });
  });

  // ── addAddress ($push) ───────────────────────────────────────────────────────

  describe('addAddress', () => {
    it('should use $push with $each and $slice:-10 to enforce max 10 addresses', async () => {
      const newAddress = { alias: 'Casa', calle: '4a Ave', ciudad: 'GT', pais: 'Guatemala' };
      const updated = { _id: 'u1', direcciones: [newAddress] };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.addAddress('u1', newAddress);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { $push: { direcciones: { $each: [newAddress], $slice: -10 } } },
        { new: true },
      );
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when user is not found on addAddress', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.addAddress('nonexistent', {})).rejects.toThrow(NotFoundException);
      await expect(service.addAddress('nonexistent', {})).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ── removeAddress ($pull) ────────────────────────────────────────────────────

  describe('removeAddress', () => {
    it('should use $pull operator to remove address by alias', async () => {
      const updated = { _id: 'u1', direcciones: [] };
      const query = createMockQuery(updated);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      const result = await service.removeAddress('u1', 'Casa');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { $pull: { direcciones: { alias: 'Casa' } } },
        { new: true },
      );
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when user is not found on removeAddress', async () => {
      const query = createMockQuery(null);
      mockModel.findByIdAndUpdate.mockReturnValue(query);

      await expect(service.removeAddress('nonexistent', 'Casa')).rejects.toThrow(NotFoundException);
      await expect(service.removeAddress('nonexistent', 'Casa')).rejects.toThrow(
        'Usuario no encontrado',
      );
    });
  });
});
