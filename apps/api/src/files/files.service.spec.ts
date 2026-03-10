import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';

// ── mock GridFSBucket ─────────────────────────────────────────────────────────

const mockUploadStream = {
  id: { toString: () => 'file-id-123' },
  on: jest.fn(),
  end: jest.fn(),
  // Required by Node.js Readable.pipe()
  write: jest.fn().mockReturnValue(true),
  once: jest.fn(),
  emit: jest.fn(),
  destroy: jest.fn(),
  removeListener: jest.fn(),
  writable: true,
};

const mockDownloadStream = {
  pipe: jest.fn(),
};

const mockFindCursor = {
  toArray: jest.fn(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

const mockBucket = {
  openUploadStream: jest.fn().mockReturnValue(mockUploadStream),
  openDownloadStream: jest.fn().mockReturnValue(mockDownloadStream),
  find: jest.fn().mockReturnValue(mockFindCursor),
  delete: jest.fn(),
};

jest.mock('mongodb', () => {
  const actual = jest.requireActual('mongodb');
  return {
    ...actual,
    GridFSBucket: jest.fn().mockImplementation(() => mockBucket),
    ObjectId: actual.ObjectId,
  };
});

// ── suite ─────────────────────────────────────────────────────────────────────

describe('FilesService', () => {
  let service: FilesService;

  const mockConnection = {
    db: { databaseName: 'fastpochi' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-apply chainable mocks after clearAllMocks
    mockBucket.find.mockReturnValue(mockFindCursor);
    mockFindCursor.sort.mockReturnThis();
    mockFindCursor.limit.mockReturnThis();
    mockBucket.openUploadStream.mockReturnValue(mockUploadStream);
    mockBucket.openDownloadStream.mockReturnValue(mockDownloadStream);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    // Manually trigger onModuleInit so the bucket is created
    service.onModuleInit();
  });

  // ── upload ────────────────────────────────────────────────────────────────

  describe('upload', () => {
    const mockFile = {
      buffer: Buffer.from('test content'),
      originalname: 'photo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    it('should open an upload stream with the original filename', async () => {
      // Simulate the stream 'finish' event
      mockUploadStream.on.mockImplementation(
        (event: string, cb: () => void) => {
          if (event === 'finish') setTimeout(cb, 0);
          return mockUploadStream;
        },
      );

      await service.upload(mockFile);

      expect(mockBucket.openUploadStream).toHaveBeenCalledWith(
        'photo.png',
        expect.objectContaining({
          metadata: expect.objectContaining({ contentType: 'image/png' }),
        }),
      );
    });

    it('should resolve with the file id and filename on success', async () => {
      mockUploadStream.on.mockImplementation(
        (event: string, cb: () => void) => {
          if (event === 'finish') setTimeout(cb, 0);
          return mockUploadStream;
        },
      );

      const result = await service.upload(mockFile);

      expect(result).toEqual({ id: 'file-id-123', filename: 'photo.png' });
    });

    it('should include metadata with contentType and uploadedAt in the upload stream options', async () => {
      mockUploadStream.on.mockImplementation(
        (event: string, cb: () => void) => {
          if (event === 'finish') setTimeout(cb, 0);
          return mockUploadStream;
        },
      );

      await service.upload(mockFile);

      const [, options] = mockBucket.openUploadStream.mock.calls[0];
      expect(options.metadata.contentType).toBe('image/png');
      expect(options.metadata.uploadedAt).toBeInstanceOf(Date);
    });
  });

  // ── getFile ───────────────────────────────────────────────────────────────

  describe('getFile', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should throw NotFoundException for an invalid ObjectId', async () => {
      await expect(service.getFile('not-an-id', {} as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getFile('not-an-id', {} as any)).rejects.toThrow(
        'ID de archivo inválido',
      );
    });

    it('should throw NotFoundException when no file is found in GridFS', async () => {
      mockFindCursor.toArray.mockResolvedValue([]);

      await expect(service.getFile(validId, {} as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getFile(validId, {} as any)).rejects.toThrow(
        'Archivo no encontrado',
      );
    });

    it('should set Content-Type header from file metadata when present', async () => {
      const mockRes = { setHeader: jest.fn() } as any;
      mockFindCursor.toArray.mockResolvedValue([
        {
          filename: 'photo.png',
          metadata: { contentType: 'image/png' },
        },
      ]);
      mockDownloadStream.pipe.mockReturnValue({});

      await service.getFile(validId, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/png',
      );
    });

    it('should infer Content-Type from filename extension when metadata is absent', async () => {
      const mockRes = { setHeader: jest.fn() } as any;
      mockFindCursor.toArray.mockResolvedValue([
        {
          filename: 'image.webp',
          metadata: {},
        },
      ]);
      mockDownloadStream.pipe.mockReturnValue({});

      await service.getFile(validId, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/webp',
      );
    });

    it('should fall back to application/octet-stream for unknown extensions', async () => {
      const mockRes = { setHeader: jest.fn() } as any;
      mockFindCursor.toArray.mockResolvedValue([
        {
          filename: 'data.bin',
          metadata: {},
        },
      ]);
      mockDownloadStream.pipe.mockReturnValue({});

      await service.getFile(validId, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('should set Content-Disposition inline header with the filename', async () => {
      const mockRes = { setHeader: jest.fn() } as any;
      mockFindCursor.toArray.mockResolvedValue([
        {
          filename: 'menu.pdf',
          metadata: { contentType: 'application/pdf' },
        },
      ]);
      mockDownloadStream.pipe.mockReturnValue({});

      await service.getFile(validId, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="menu.pdf"',
      );
    });

    it('should pipe the download stream to the response', async () => {
      const mockRes = { setHeader: jest.fn() } as any;
      mockFindCursor.toArray.mockResolvedValue([
        {
          filename: 'photo.jpg',
          metadata: { contentType: 'image/jpeg' },
        },
      ]);

      await service.getFile(validId, mockRes);

      expect(mockBucket.openDownloadStream).toHaveBeenCalledTimes(1);
      expect(mockDownloadStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });

  // ── deleteFile ────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should call bucket.delete and return { deleted: true }', async () => {
      mockBucket.delete.mockResolvedValue(undefined);

      const result = await service.deleteFile(validId);

      expect(mockBucket.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when bucket.delete rejects', async () => {
      mockBucket.delete.mockRejectedValue(new Error('not found in bucket'));

      await expect(service.deleteFile(validId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteFile(validId)).rejects.toThrow(
        'Archivo no encontrado',
      );
    });
  });

  // ── listFiles ─────────────────────────────────────────────────────────────

  describe('listFiles', () => {
    it('should return files sorted by uploadDate descending, limited to 50', async () => {
      const files = [{ filename: 'a.png' }, { filename: 'b.jpg' }];
      mockFindCursor.toArray.mockResolvedValue(files);

      const result = await service.listFiles();

      expect(mockBucket.find).toHaveBeenCalledWith({});
      expect(mockFindCursor.sort).toHaveBeenCalledWith({ uploadDate: -1 });
      expect(mockFindCursor.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(files);
    });

    it('should return an empty array when no files exist', async () => {
      mockFindCursor.toArray.mockResolvedValue([]);

      const result = await service.listFiles();

      expect(result).toEqual([]);
    });
  });

  // ── mimeFromFilename (via getFile) ─────────────────────────────────────────

  describe('mimeFromFilename extension mapping', () => {
    const cases = [
      ['photo.png', 'image/png'],
      ['photo.jpg', 'image/jpeg'],
      ['photo.jpeg', 'image/jpeg'],
      ['animation.gif', 'image/gif'],
      ['image.webp', 'image/webp'],
      ['icon.svg', 'image/svg+xml'],
      ['doc.pdf', 'application/pdf'],
      ['file.bin', 'application/octet-stream'],
      ['noextension', 'application/octet-stream'],
    ];

    cases.forEach(([filename, expectedMime]) => {
      it(`should return "${expectedMime}" for "${filename}"`, async () => {
        const mockRes = { setHeader: jest.fn() } as any;
        mockFindCursor.toArray.mockResolvedValue([{ filename, metadata: {} }]);
        mockDownloadStream.pipe.mockReturnValue({});

        await service.getFile('507f1f77bcf86cd799439011', mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          expectedMime,
        );
      });
    });
  });
});
