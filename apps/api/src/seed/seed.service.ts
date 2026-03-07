import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Restaurante } from '../restaurantes/schemas/restaurante.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Orden } from '../ordenes/schemas/orden.schema';
import { Resena } from '../resenas/schemas/resena.schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

const ESTADOS: string[] = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'];
const PESOS_ESTADO = [0.05, 0.05, 0.1, 0.7, 0.1]; // mayoría entregadas

function weightedEstado(): string {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < PESOS_ESTADO.length; i++) {
        acc += PESOS_ESTADO[i];
        if (r < acc) return ESTADOS[i];
    }
    return 'entregado';
}

function randomDate(daysBack: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - randInt(0, daysBack));
    d.setHours(randInt(8, 23), randInt(0, 59));
    return d;
}

// ── Datos de ejemplo ─────────────────────────────────────────────────────────

const NOMBRES = ['Ana García', 'Carlos López', 'María Rodríguez', 'José Martínez',
    'Laura González', 'Pedro Sánchez', 'Isabel Fernández', 'Miguel Díaz',
    'Carmen Moreno', 'Francisco Jiménez', 'Elena Ruiz', 'Antonio Hernández',
    'Sofía Torres', 'David Flores', 'Lucía Ramírez', 'Javier Vargas',
    'Andrea Castillo', 'Roberto Mendoza', 'Valeria Cruz', 'Sergio Romero'];

const RESTAURANTES_DATA = [
    { nombre: 'Burger House', categorias: ['hamburguesas', 'americana'], ciudad: 'Guatemala' },
    { nombre: 'Sushi Zen', categorias: ['japonesa', 'sushi'], ciudad: 'Guatemala' },
    { nombre: 'La Pasta Fresca', categorias: ['italiana', 'pasta'], ciudad: 'Guatemala' },
    { nombre: 'Taco Loco', categorias: ['mexicana', 'tacos'], ciudad: 'Guatemala' },
    { nombre: 'Pizza Roma', categorias: ['italiana', 'pizza'], ciudad: 'Guatemala' },
    { nombre: 'El Grill', categorias: ['parrilla', 'carnes'], ciudad: 'Guatemala' },
    { nombre: 'Veggie World', categorias: ['vegetariana', 'saludable'], ciudad: 'Guatemala' },
    { nombre: 'Mar y Sabor', categorias: ['mariscos', 'pescados'], ciudad: 'Guatemala' },
    { nombre: 'Pollo Dorado', categorias: ['pollo', 'guatemalteca'], ciudad: 'Guatemala' },
    { nombre: 'Café Central', categorias: ['café', 'postres', 'desayunos'], ciudad: 'Guatemala' },
];

const ITEMS_POR_RESTAURANTE: Record<string, any[]> = {
    'Burger House': [
        { nombre: 'Clásica Burger', precio: 45, categoria: 'principal', etiquetas: ['carne', 'popular'] },
        { nombre: 'Doble Cheese', precio: 65, categoria: 'principal', etiquetas: ['carne', 'queso'] },
        { nombre: 'Papas Fritas', precio: 20, categoria: 'entrada', etiquetas: ['papas'] },
        { nombre: 'Onion Rings', precio: 25, categoria: 'entrada', etiquetas: ['frito'] },
        { nombre: 'Milkshake Vainilla', precio: 30, categoria: 'bebida', etiquetas: ['frío'] },
    ],
    'Sushi Zen': [
        { nombre: 'Roll California', precio: 55, categoria: 'principal', etiquetas: ['sushi', 'popular'] },
        { nombre: 'Sashimi Salmón', precio: 80, categoria: 'principal', etiquetas: ['salmón', 'premium'] },
        { nombre: 'Gyoza', precio: 40, categoria: 'entrada', etiquetas: ['frito'] },
        { nombre: 'Miso Soup', precio: 20, categoria: 'entrada', etiquetas: ['caliente'] },
        { nombre: 'Té Verde', precio: 15, categoria: 'bebida', etiquetas: ['caliente'] },
    ],
};

const DEFAULT_ITEMS = [
    { nombre: 'Especialidad de la casa', precio: 70, categoria: 'principal', etiquetas: ['popular'] },
    { nombre: 'Plato del día', precio: 55, categoria: 'principal', etiquetas: ['oferta'] },
    { nombre: 'Entrada mixta', precio: 35, categoria: 'entrada', etiquetas: [] },
    { nombre: 'Postre especial', precio: 30, categoria: 'postre', etiquetas: ['dulce'] },
    { nombre: 'Bebida natural', precio: 20, categoria: 'bebida', etiquetas: ['frío'] },
];

// ── SeedService ───────────────────────────────────────────────────────────────

@Injectable()
export class SeedService {
    constructor(
        @InjectModel(Usuario.name) private usuarioModel: Model<any>,
        @InjectModel(Restaurante.name) private restauranteModel: Model<any>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<any>,
        @InjectModel(Orden.name) private ordenModel: Model<any>,
        @InjectModel(Resena.name) private resenaModel: Model<any>,
    ) { }

    async run(): Promise<{ message: string; counts: Record<string, number> }> {
        await this.clearAll();

        const usuarios = await this.seedUsuarios();
        const clientes = usuarios.filter((u) => u.rol === 'cliente');
        const propietarios = usuarios.filter((u) => u.rol === 'propietario');

        const restaurantes = await this.seedRestaurantes(propietarios);
        const items = await this.seedMenuItems(restaurantes);
        const ordenes = await this.seedOrdenes(clientes, restaurantes, items);
        await this.seedResenas(clientes, restaurantes);

        return {
            message: 'Seed completado exitosamente',
            counts: {
                usuarios: usuarios.length,
                restaurantes: restaurantes.length,
                menuItems: items.length,
                ordenes,
                resenas: clientes.length * restaurantes.length,
            },
        };
    }

    async clearAll(): Promise<void> {
        await Promise.all([
            this.usuarioModel.deleteMany({}),
            this.restauranteModel.deleteMany({}),
            this.menuItemModel.deleteMany({}),
            this.ordenModel.deleteMany({}),
            this.resenaModel.deleteMany({}),
        ]);
    }

    private async seedUsuarios(): Promise<any[]> {
        const docs = [
            { nombre: 'Admin FastPochi', email: 'admin@fastpochi.com', password: 'admin123', rol: 'admin', activo: true, preferencias: [], direcciones: [] },
        ];

        // Propietarios
        for (let i = 0; i < RESTAURANTES_DATA.length; i++) {
            docs.push({
                nombre: `Propietario ${i + 1}`,
                email: `owner${i + 1}@fastpochi.com`,
                password: 'pass123',
                rol: 'propietario',
                activo: true,
                preferencias: [],
                direcciones: [],
            });
        }

        // Clientes
        for (let i = 0; i < NOMBRES.length; i++) {
            docs.push({
                nombre: NOMBRES[i],
                email: `cliente${i + 1}@fastpochi.com`,
                password: 'pass123',
                rol: 'cliente',
                activo: true,
                preferencias: [pick(['pizza', 'sushi', 'hamburguesas', 'tacos', 'pasta'])] as any,
                direcciones: [{
                    alias: 'Casa',
                    calle: `${randInt(1, 99)} Calle ${randInt(1, 20)}-${randInt(1, 50)}`,
                    ciudad: 'Guatemala',
                    pais: 'Guatemala',
                    es_principal: true,
                }] as any,
            });
        }

        return this.usuarioModel.insertMany(docs);
    }

    private async seedRestaurantes(propietarios: any[]): Promise<any[]> {
        const docs = RESTAURANTES_DATA.map((r, i) => ({
            propietario_id: propietarios[i]?._id ?? propietarios[0]._id,
            nombre: r.nombre,
            descripcion: `El mejor restaurante de ${r.categorias[0]} en Guatemala`,
            ubicacion: {
                type: 'Point',
                coordinates: [-90.5 + rand(-0.1, 0.1), 14.6 + rand(-0.1, 0.1)],
            },
            direccion: {
                calle: `${randInt(1, 20)} Avenida ${randInt(1, 15)}-${randInt(1, 50)}`,
                ciudad: r.ciudad,
                pais: 'Guatemala',
                codigo_postal: `0100${randInt(1, 9)}`,
            },
            categorias: r.categorias,
            horario: {
                lunes: { abre: '08:00', cierra: '22:00', cerrado: false },
                martes: { abre: '08:00', cierra: '22:00', cerrado: false },
                miercoles: { abre: '08:00', cierra: '22:00', cerrado: false },
                jueves: { abre: '08:00', cierra: '22:00', cerrado: false },
                viernes: { abre: '08:00', cierra: '23:00', cerrado: false },
                sabado: { abre: '09:00', cierra: '23:00', cerrado: false },
                domingo: { abre: '10:00', cierra: '21:00', cerrado: false },
            },
            telefono: `+502 ${randInt(2000, 9999)}-${randInt(1000, 9999)}`,
            calificacion_prom: 0,
            total_resenas: 0,
            activo: true,
        }));

        return this.restauranteModel.insertMany(docs);
    }

    private async seedMenuItems(restaurantes: any[]): Promise<any[]> {
        const docs: any[] = [];
        for (const rest of restaurantes) {
            const items = ITEMS_POR_RESTAURANTE[rest.nombre] ?? DEFAULT_ITEMS;
            for (const item of items) {
                docs.push({ ...item, restaurante_id: rest._id, disponible: true });
            }
        }
        return this.menuItemModel.insertMany(docs);
    }

    private async seedOrdenes(
        clientes: any[],
        restaurantes: any[],
        items: any[],
    ): Promise<number> {
        const TOTAL = 50_000;
        const BATCH = 1_000;
        let inserted = 0;

        for (let b = 0; b < TOTAL / BATCH; b++) {
            const ops = Array.from({ length: BATCH }, () => {
                const cliente = pick(clientes);
                const restaurante = pick(restaurantes);
                const restItems = items.filter(
                    (it) => it.restaurante_id.toString() === restaurante._id.toString(),
                );
                const selectedItems = restItems.length
                    ? [pick(restItems), ...(Math.random() > 0.5 ? [pick(restItems)] : [])]
                    : [{ _id: new Types.ObjectId(), nombre: 'Item genérico', precio: 50, cantidad: 1 }];

                const orderItems = selectedItems.map((it) => ({
                    menu_item_id: it._id,
                    nombre: it.nombre,
                    precio: it.precio,
                    cantidad: randInt(1, 3),
                }));

                const total = orderItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
                const createdAt = randomDate(365);

                return {
                    insertOne: {
                        document: {
                            cliente_id: cliente._id,
                            restaurante_id: restaurante._id,
                            items: orderItems,
                            estado: weightedEstado(),
                            total,
                            direccion_entrega: {
                                calle: cliente.direcciones?.[0]?.calle ?? '1 Calle 1-1',
                                ciudad: 'Guatemala',
                                pais: 'Guatemala',
                            },
                            createdAt,
                            updatedAt: createdAt,
                        },
                    },
                };
            });

            await this.ordenModel.bulkWrite(ops as any[], { ordered: false });
            inserted += BATCH;
        }

        return inserted;
    }

    private async seedResenas(clientes: any[], restaurantes: any[]): Promise<void> {
        const ops: any[] = [];
        for (const cliente of clientes) {
            for (const rest of restaurantes) {
                if (Math.random() > 0.4) continue; // no todos reseñan todos
                ops.push({
                    insertOne: {
                        document: {
                            cliente_id: cliente._id,
                            restaurante_id: rest._id,
                            calificacion: randInt(1, 6),
                            comentario: pick([
                                'Excelente comida y servicio',
                                'Muy buena experiencia',
                                'La comida llegó fría',
                                'Perfecto, lo recomiendo',
                                'Buena relación calidad-precio',
                                'Demoró más de lo esperado',
                                'Increíble, volvería',
                                null,
                            ]),
                            createdAt: randomDate(180),
                        },
                    },
                });
            }
        }
        if (ops.length) await (this.resenaModel as any).bulkWrite(ops, { ordered: false });
    }
}
