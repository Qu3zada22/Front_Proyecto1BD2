import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { GridFSBucket } from 'mongodb';
import { spawn } from 'child_process';
import * as path from 'path';
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Resena } from '../resenas/schemas/resena.schema';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<any>,
    @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<any>,
    @InjectModel(Orden.name) private ordenModel: Model<any>,
    @InjectModel(Resena.name) private resenaModel: Model<any>,
    @InjectConnection() private connection: Connection,
    private readonly config: ConfigService,
  ) {}

  async run(): Promise<{ message: string; counts: Record<string, number> }> {
    await this.runIngestScript();

    const [usuarios, restaurantes, menuItems, ordenes, resenas] =
      await Promise.all([
        this.usuarioModel.countDocuments(),
        this.restauranteModel.countDocuments(),
        this.menuItemModel.countDocuments(),
        this.ordenModel.countDocuments(),
        this.resenaModel.countDocuments(),
      ]);

    return {
      message: 'Seed completado exitosamente',
      counts: { usuarios, restaurantes, menuItems, ordenes, resenas },
    };
  }

  private runIngestScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mongoUri = this.config.get<string>('MONGODB_URI') ?? '';
      // Go up from dist/seed/ → dist/ → api/ → apps/ → monorepo root
      const monoRepoRoot = path.resolve(__dirname, '../../../..');
      const ingestPath = path.join(
        monoRepoRoot,
        'apps',
        'database',
        'ingest.js',
      );
      const ingestDir = path.dirname(ingestPath);

      this.logger.log(`Running ingest: ${ingestPath}`);

      const child = spawn('node', [ingestPath], {
        cwd: ingestDir,
        env: {
          ...process.env,
          MONGODB_URI: mongoUri,
          MONGO_URI: mongoUri,
          DB_NAME: 'fastpochi',
          MONGO_DB: 'fastpochi',
        },
      });

      child.stdout.on('data', (d) => this.logger.log(d.toString().trim()));
      child.stderr.on('data', (d) => this.logger.warn(d.toString().trim()));

      child.on('close', (code) => {
        if (code === 0) resolve();
        else
          reject(
            new InternalServerErrorException(
              `Ingest script exited with code ${code}`,
            ),
          );
      });
    });
  }

  async clearAll(): Promise<void> {
    const bucket = new GridFSBucket(this.connection.db as any, {
      bucketName: 'media',
    });
    await Promise.all([
      this.usuarioModel.deleteMany({}),
      this.restauranteModel.deleteMany({}),
      this.menuItemModel.deleteMany({}),
      this.ordenModel.deleteMany({}),
      this.resenaModel.deleteMany({}),
      bucket.drop().catch(() => {}),
    ]);
  }
}
