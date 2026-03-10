// ============================================================
// FastPochi - Mock Data Layer
// Follows the MongoDB document schema from the project spec
// ============================================================

// ---- Types ----

export type Rol = "cliente" | "propietario" | "admin";

export interface DireccionUsuario {
  alias: string;
  calle: string;
  ciudad: string;
  pais: string;
  es_principal: boolean;
  coords?: { type: "Point"; coordinates: [number, number] };
}

export interface Usuario {
  _id: string;
  nombre: string;
  email: string;
  password: string; // bcrypt hash placeholder
  telefono?: string;
  rol: Rol;
  activo: boolean;
  fecha_registro: string;
  preferencias: string[];
  direcciones: DireccionUsuario[];
}

export interface HorarioDia {
  abre: string;
  cierra: string;
  cerrado: boolean;
}

export interface Restaurante {
  _id: string;
  propietario_id: string;
  nombre: string;
  descripcion: string;
  ubicacion: { type: "Point"; coordinates: [number, number] };
  direccion: {
    calle: string;
    ciudad: string;
    pais: string;
    codigo_postal: string;
  };
  categorias: string[];
  horario: Record<string, HorarioDia>;
  telefono: string;
  img_portada: string;
  calificacion_prom: number;
  total_resenas: number;
  activo: boolean;
  fecha_creacion: string;
}

export interface MenuItem {
  _id: string;
  restaurante_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: "entrada" | "principal" | "postre" | "bebida" | "extra";
  etiquetas: string[];
  imagen: string;
  disponible: boolean;
  veces_ordenado: number;
  orden_display: number;
  fecha_creacion: string;
}

export interface ItemOrden {
  item_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  notas_item?: string;
}

export interface EstadoLog {
  estado: string;
  timestamp: string;
  actor_id: string;
  nota?: string;
}

export type EstadoOrden =
  | "pendiente"
  | "en_proceso"
  | "en_camino"
  | "entregado"
  | "cancelado";

export interface Orden {
  _id: string;
  usuario_id: string;
  restaurante_id: string;
  items: ItemOrden[];
  estado: EstadoOrden;
  historial_estados: EstadoLog[];
  total: number;
  direccion_entrega: {
    alias: string;
    calle: string;
    ciudad: string;
    pais: string;
  };
  notas?: string;
  fecha_creacion: string;
  fecha_entrega_real?: string;
  tiene_resena: boolean;
}

export interface Resena {
  _id: string;
  usuario_id: string;
  restaurante_id?: string;
  orden_id?: string;
  calificacion: number;
  titulo: string;
  comentario: string;
  tags: string[];
  likes: string[];
  activa: boolean;
  fecha: string;
}

// ---- Preference / Category Tags ----

export const PREFERENCE_TAGS = [
  "pizza",
  "hamburguesas",
  "sushi",
  "mexicana",
  "italiana",
  "china",
  "thai",
  "vegano",
  "sin_gluten",
  "mariscos",
  "postres",
  "cafe",
  "saludable",
  "rapida",
  "guatemalteca",
];

export const RESTAURANT_CATEGORIES = [
  "italiana",
  "mexicana",
  "guatemalteca",
  "sushi",
  "pizza",
  "hamburguesas",
  "china",
  "thai",
  "mariscos",
  "cafe",
  "saludable",
  "rapida",
  "postres",
  "gourmet",
];

export const REVIEW_TAGS = [
  "rapido",
  "sabroso",
  "limpio",
  "buen_servicio",
  "porciones_grandes",
  "buena_presentacion",
  "precio_justo",
  "ambiente_agradable",
  "fresco",
];

const HORARIO_DEFAULT: Record<string, HorarioDia> = {
  lunes: { abre: "08:00", cierra: "22:00", cerrado: false },
  martes: { abre: "08:00", cierra: "22:00", cerrado: false },
  miercoles: { abre: "08:00", cierra: "22:00", cerrado: false },
  jueves: { abre: "08:00", cierra: "22:00", cerrado: false },
  viernes: { abre: "08:00", cierra: "23:00", cerrado: false },
  sabado: { abre: "09:00", cierra: "23:00", cerrado: false },
  domingo: { abre: "09:00", cierra: "20:00", cerrado: false },
};

// ---- Mock Users ----

export const usuarios: Usuario[] = [
  {
    _id: "u1",
    nombre: "Carlos Mendoza",
    email: "carlos@correo.com",
    password: "$2b$10$hashedpassword1",
    telefono: "+50212345678",
    rol: "cliente",
    activo: true,
    fecha_registro: "2025-01-15T08:00:00Z",
    preferencias: ["pizza", "italiana", "hamburguesas"],
    direcciones: [
      {
        alias: "Casa",
        calle: "4a Avenida 12-34, Zona 10",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
        coords: { type: "Point", coordinates: [-90.5069, 14.6349] },
      },
      {
        alias: "Trabajo",
        calle: "6a Calle 3-21, Zona 4",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: false,
      },
    ],
  },
  {
    _id: "u2",
    nombre: "Maria Lopez",
    email: "maria@correo.com",
    password: "$2b$10$hashedpassword2",
    telefono: "+50287654321",
    rol: "cliente",
    activo: true,
    fecha_registro: "2025-02-20T10:00:00Z",
    preferencias: ["sushi", "thai", "saludable", "vegano"],
    direcciones: [
      {
        alias: "Casa",
        calle: "Blvd Los Proceres 24-69, Zona 10",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u3",
    nombre: "Jose Garcia",
    email: "jose@correo.com",
    password: "$2b$10$hashedpassword3",
    telefono: "+50255551234",
    rol: "cliente",
    activo: true,
    fecha_registro: "2025-03-10T14:00:00Z",
    preferencias: ["mexicana", "guatemalteca", "mariscos", "rapida"],
    direcciones: [
      {
        alias: "Casa",
        calle: "12 Calle 1-25, Zona 1",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u4",
    nombre: "Roberto Castillo",
    email: "roberto@correo.com",
    password: "$2b$10$hashedpassword4",
    telefono: "+50233334444",
    rol: "propietario",
    activo: true,
    fecha_registro: "2024-11-05T09:00:00Z",
    preferencias: [],
    direcciones: [
      {
        alias: "Oficina",
        calle: "7a Avenida 5-10, Zona 4",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u5",
    nombre: "Ana Ramirez",
    email: "ana@correo.com",
    password: "$2b$10$hashedpassword5",
    telefono: "+50244445555",
    rol: "propietario",
    activo: true,
    fecha_registro: "2024-12-01T11:00:00Z",
    preferencias: [],
    direcciones: [
      {
        alias: "Casa",
        calle: "3a Calle 8-15, Zona 14",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u6",
    nombre: "Pedro Alvarez",
    email: "pedro@correo.com",
    password: "$2b$10$hashedpassword6",
    telefono: "+50266667777",
    rol: "propietario",
    activo: true,
    fecha_registro: "2025-01-20T07:00:00Z",
    preferencias: [],
    direcciones: [
      {
        alias: "Oficina",
        calle: "Diagonal 6, 13-01, Zona 10",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u7",
    nombre: "Admin Principal",
    email: "admin@fastpochi.com",
    password: "$2b$10$hashedpassword7",
    telefono: "+50211112222",
    rol: "admin",
    activo: true,
    fecha_registro: "2024-06-01T00:00:00Z",
    preferencias: [],
    direcciones: [],
  },
  {
    _id: "u8",
    nombre: "Sofia Hernandez",
    email: "sofia@correo.com",
    password: "$2b$10$hashedpassword8",
    telefono: "+50299998888",
    rol: "admin",
    activo: true,
    fecha_registro: "2024-07-15T00:00:00Z",
    preferencias: [],
    direcciones: [],
  },
  {
    _id: "u9",
    nombre: "Laura Martinez",
    email: "laura@correo.com",
    password: "$2b$10$hashedpassword9",
    telefono: "+50277776666",
    rol: "cliente",
    activo: true,
    fecha_registro: "2025-04-01T16:00:00Z",
    preferencias: ["cafe", "postres", "italiana"],
    direcciones: [
      {
        alias: "Casa",
        calle: "10a Calle 5-20, Zona 13",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
  {
    _id: "u10",
    nombre: "Diego Morales",
    email: "diego@correo.com",
    password: "$2b$10$hashedpassword10",
    telefono: "+50288887777",
    rol: "cliente",
    activo: true,
    fecha_registro: "2025-05-10T12:00:00Z",
    preferencias: ["hamburguesas", "rapida", "pizza"],
    direcciones: [
      {
        alias: "Casa",
        calle: "2a Avenida 9-30, Zona 9",
        ciudad: "Guatemala",
        pais: "GT",
        es_principal: true,
      },
    ],
  },
];

// ---- Mock Restaurants ----

export const restaurantes: Restaurante[] = [
  {
    _id: "r1",
    propietario_id: "u4",
    nombre: "La Trattoria Chapina",
    descripcion:
      "Autentica cocina italiana con un toque guatemalteco. Pastas artesanales, pizzas al horno de lena y los mejores postres.",
    ubicacion: { type: "Point", coordinates: [-90.5133, 14.6133] },
    direccion: {
      calle: "5a Avenida 11-59, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01010",
    },
    categorias: ["italiana", "pizza", "gourmet"],
    horario: HORARIO_DEFAULT,
    telefono: "+50222334455",
    img_portada:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
    calificacion_prom: 4.6,
    total_resenas: 28,
    activo: true,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },
  {
    _id: "r2",
    propietario_id: "u4",
    nombre: "Burger Town GT",
    descripcion:
      "Las mejores hamburguesas artesanales de la ciudad. Carne angus, pan brioche y salsas caseras.",
    ubicacion: { type: "Point", coordinates: [-90.5225, 14.5967] },
    direccion: {
      calle: "18 Calle 5-56, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01010",
    },
    categorias: ["hamburguesas", "rapida"],
    horario: HORARIO_DEFAULT,
    telefono: "+50233445566",
    img_portada:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=400&fit=crop",
    calificacion_prom: 4.3,
    total_resenas: 45,
    activo: true,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },
  {
    _id: "r3",
    propietario_id: "u5",
    nombre: "Sakura Sushi Bar",
    descripcion:
      "Sushi fresco preparado al momento. Rolls especiales, sashimi premium y ramen autentico japones.",
    ubicacion: { type: "Point", coordinates: [-90.5067, 14.62] },
    direccion: {
      calle: "12 Calle 2-04, Zona 14",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01014",
    },
    categorias: ["sushi", "thai"],
    horario: {
      ...HORARIO_DEFAULT,
      domingo: { abre: "00:00", cierra: "00:00", cerrado: true },
    },
    telefono: "+50244556677",
    img_portada:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=400&fit=crop",
    calificacion_prom: 4.8,
    total_resenas: 62,
    activo: true,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "r4",
    propietario_id: "u5",
    nombre: "Taco Loco",
    descripcion:
      "Sabores autenticos de Mexico. Tacos al pastor, burritos, quesadillas y mas. Todo preparado con ingredientes frescos.",
    ubicacion: { type: "Point", coordinates: [-90.515, 14.628] },
    direccion: {
      calle: "6a Avenida 9-21, Zona 1",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01001",
    },
    categorias: ["mexicana", "rapida"],
    horario: HORARIO_DEFAULT,
    telefono: "+50255667788",
    img_portada:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=400&fit=crop",
    calificacion_prom: 4.2,
    total_resenas: 35,
    activo: true,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },
  {
    _id: "r5",
    propietario_id: "u6",
    nombre: "Green Bowl",
    descripcion:
      "Comida saludable y deliciosa. Bowls, ensaladas, smoothies y opciones veganas para todos los gustos.",
    ubicacion: { type: "Point", coordinates: [-90.509, 14.615] },
    direccion: {
      calle: "1a Avenida 13-22, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01010",
    },
    categorias: ["saludable", "vegano"],
    horario: HORARIO_DEFAULT,
    telefono: "+50266778899",
    img_portada:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=400&fit=crop",
    calificacion_prom: 4.5,
    total_resenas: 20,
    activo: true,
    fecha_creacion: "2025-02-01T07:00:00Z",
  },
  {
    _id: "r6",
    propietario_id: "u6",
    nombre: "Cafe de la Esquina",
    descripcion:
      "El mejor cafe guatemalteco de especialidad. Reposteria artesanal, desayunos y un ambiente acogedor.",
    ubicacion: { type: "Point", coordinates: [-90.518, 14.605] },
    direccion: {
      calle: "Ruta 4, 3-56, Zona 4",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01004",
    },
    categorias: ["cafe", "postres"],
    horario: {
      ...HORARIO_DEFAULT,
      lunes: { abre: "06:00", cierra: "20:00", cerrado: false },
    },
    telefono: "+50277889900",
    img_portada:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=400&fit=crop",
    calificacion_prom: 4.7,
    total_resenas: 55,
    activo: true,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },
  {
    _id: "r7",
    propietario_id: "u6",
    nombre: "Mariscos del Puerto",
    descripcion:
      "Los mejores mariscos frescos directos del Pacifico. Ceviches, cocteles, pescado frito y platillos guatemaltecos de mar.",
    ubicacion: { type: "Point", coordinates: [-90.52, 14.61] },
    direccion: {
      calle: "15 Calle 3-45, Zona 13",
      ciudad: "Guatemala",
      pais: "GT",
      codigo_postal: "01013",
    },
    categorias: ["mariscos", "guatemalteca"],
    horario: {
      ...HORARIO_DEFAULT,
      lunes: { abre: "00:00", cierra: "00:00", cerrado: true },
    },
    telefono: "+50288990011",
    img_portada:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&h=400&fit=crop",
    calificacion_prom: 4.4,
    total_resenas: 18,
    activo: true,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
];

// ---- Mock Menu Items ----

export const menuItems: MenuItem[] = [
  // La Trattoria Chapina (r1)
  {
    _id: "mi1",
    restaurante_id: "r1",
    nombre: "Bruschetta Clasica",
    descripcion: "Pan tostado con tomate fresco, albahaca y aceite de oliva",
    precio: 45,
    categoria: "entrada",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 120,
    orden_display: 1,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },
  {
    _id: "mi2",
    restaurante_id: "r1",
    nombre: "Pasta Carbonara",
    descripcion: "Spaghetti con salsa cremosa de huevo, panceta y parmesano",
    precio: 85,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 230,
    orden_display: 2,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },
  {
    _id: "mi3",
    restaurante_id: "r1",
    nombre: "Pizza Margherita",
    descripcion:
      "Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca",
    precio: 95,
    categoria: "principal",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 310,
    orden_display: 3,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },
  {
    _id: "mi4",
    restaurante_id: "r1",
    nombre: "Tiramisu",
    descripcion:
      "Postre italiano clasico con cafe espresso, mascarpone y cacao",
    precio: 55,
    categoria: "postre",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 180,
    orden_display: 4,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },
  {
    _id: "mi5",
    restaurante_id: "r1",
    nombre: "Limonada Italiana",
    descripcion: "Limonada fresca con menta y un toque de jengibre",
    precio: 25,
    categoria: "bebida",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 95,
    orden_display: 5,
    fecha_creacion: "2024-11-10T09:00:00Z",
  },

  // Burger Town GT (r2)
  {
    _id: "mi6",
    restaurante_id: "r2",
    nombre: "Aros de Cebolla",
    descripcion: "Crujientes aros de cebolla con salsa ranch",
    precio: 35,
    categoria: "entrada",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 150,
    orden_display: 1,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },
  {
    _id: "mi7",
    restaurante_id: "r2",
    nombre: "Classic Smash Burger",
    descripcion:
      "Doble carne angus, queso cheddar, lechuga, tomate y salsa especial",
    precio: 75,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 420,
    orden_display: 2,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },
  {
    _id: "mi8",
    restaurante_id: "r2",
    nombre: "BBQ Bacon Burger",
    descripcion: "Carne angus, bacon ahumado, cebolla caramelizada y salsa BBQ",
    precio: 85,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 380,
    orden_display: 3,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },
  {
    _id: "mi9",
    restaurante_id: "r2",
    nombre: "Papas con Queso",
    descripcion:
      "Papas fritas crujientes con queso cheddar derretido y jalapenos",
    precio: 40,
    categoria: "extra",
    etiquetas: ["picante"],
    imagen:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 200,
    orden_display: 4,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },
  {
    _id: "mi10",
    restaurante_id: "r2",
    nombre: "Milkshake de Oreo",
    descripcion: "Batido cremoso con galletas Oreo y crema batida",
    precio: 35,
    categoria: "bebida",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 160,
    orden_display: 5,
    fecha_creacion: "2024-12-01T10:00:00Z",
  },

  // Sakura Sushi Bar (r3)
  {
    _id: "mi11",
    restaurante_id: "r3",
    nombre: "Edamame",
    descripcion: "Vainas de soja al vapor con sal marina",
    precio: 30,
    categoria: "entrada",
    etiquetas: ["vegano", "sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 200,
    orden_display: 1,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "mi12",
    restaurante_id: "r3",
    nombre: "Dragon Roll",
    descripcion:
      "Roll de tempura de camaron con aguacate, anguila y salsa especial",
    precio: 110,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 350,
    orden_display: 2,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "mi13",
    restaurante_id: "r3",
    nombre: "Salmon Sashimi",
    descripcion: "8 piezas de salmon fresco cortado a la perfeccion",
    precio: 95,
    categoria: "principal",
    etiquetas: ["sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 280,
    orden_display: 3,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "mi14",
    restaurante_id: "r3",
    nombre: "Ramen Tonkotsu",
    descripcion:
      "Caldo de cerdo cremoso, fideos, chashu, huevo marinado y nori",
    precio: 85,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 190,
    orden_display: 4,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "mi15",
    restaurante_id: "r3",
    nombre: "Mochi de Matcha",
    descripcion: "3 piezas de mochi relleno de helado de matcha",
    precio: 45,
    categoria: "postre",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 120,
    orden_display: 5,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },
  {
    _id: "mi16",
    restaurante_id: "r3",
    nombre: "Te Verde",
    descripcion: "Te verde japones caliente o frio",
    precio: 20,
    categoria: "bebida",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 100,
    orden_display: 6,
    fecha_creacion: "2025-01-05T08:00:00Z",
  },

  // Taco Loco (r4)
  {
    _id: "mi17",
    restaurante_id: "r4",
    nombre: "Guacamole con Totopos",
    descripcion: "Guacamole fresco preparado al momento con totopos de maiz",
    precio: 35,
    categoria: "entrada",
    etiquetas: ["vegano", "sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 180,
    orden_display: 1,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },
  {
    _id: "mi18",
    restaurante_id: "r4",
    nombre: "Tacos al Pastor",
    descripcion:
      "3 tacos de cerdo marinado al pastor con pina, cilantro y cebolla",
    precio: 55,
    categoria: "principal",
    etiquetas: ["picante"],
    imagen:
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 400,
    orden_display: 2,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },
  {
    _id: "mi19",
    restaurante_id: "r4",
    nombre: "Burrito Supremo",
    descripcion:
      "Tortilla de harina grande rellena de carne, frijoles, arroz, queso y crema",
    precio: 65,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 290,
    orden_display: 3,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },
  {
    _id: "mi20",
    restaurante_id: "r4",
    nombre: "Churros con Chocolate",
    descripcion: "Churros crujientes con salsa de chocolate caliente",
    precio: 30,
    categoria: "postre",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1624371414361-e670edf4898e?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 140,
    orden_display: 4,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },
  {
    _id: "mi21",
    restaurante_id: "r4",
    nombre: "Agua de Horchata",
    descripcion: "Bebida tradicional mexicana de arroz con canela",
    precio: 20,
    categoria: "bebida",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 110,
    orden_display: 5,
    fecha_creacion: "2025-01-15T09:00:00Z",
  },

  // Green Bowl (r5)
  {
    _id: "mi22",
    restaurante_id: "r5",
    nombre: "Sopa de Lentejas",
    descripcion: "Sopa caliente de lentejas con especias y verduras",
    precio: 35,
    categoria: "entrada",
    etiquetas: ["vegano", "sin_gluten", "saludable"],
    imagen:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 90,
    orden_display: 1,
    fecha_creacion: "2025-02-01T07:00:00Z",
  },
  {
    _id: "mi23",
    restaurante_id: "r5",
    nombre: "Buddha Bowl",
    descripcion:
      "Bowl de quinoa, garbanzos, aguacate, kale, zanahoria y aderezo tahini",
    precio: 75,
    categoria: "principal",
    etiquetas: ["vegano", "sin_gluten", "saludable"],
    imagen:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 210,
    orden_display: 2,
    fecha_creacion: "2025-02-01T07:00:00Z",
  },
  {
    _id: "mi24",
    restaurante_id: "r5",
    nombre: "Wrap Mediterraneo",
    descripcion:
      "Tortilla integral con hummus, falafel, verduras frescas y salsa tzatziki",
    precio: 65,
    categoria: "principal",
    etiquetas: ["saludable"],
    imagen:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 170,
    orden_display: 3,
    fecha_creacion: "2025-02-01T07:00:00Z",
  },
  {
    _id: "mi25",
    restaurante_id: "r5",
    nombre: "Smoothie de Frutas",
    descripcion: "Licuado de mango, fresa, banana y leche de almendra",
    precio: 30,
    categoria: "bebida",
    etiquetas: ["vegano", "saludable"],
    imagen:
      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 130,
    orden_display: 4,
    fecha_creacion: "2025-02-01T07:00:00Z",
  },

  // Cafe de la Esquina (r6)
  {
    _id: "mi26",
    restaurante_id: "r6",
    nombre: "Tostada de Aguacate",
    descripcion: "Pan artesanal con aguacate, huevo pochado y semillas",
    precio: 45,
    categoria: "entrada",
    etiquetas: ["saludable"],
    imagen:
      "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 160,
    orden_display: 1,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },
  {
    _id: "mi27",
    restaurante_id: "r6",
    nombre: "Panini Caprese",
    descripcion: "Pan ciabatta con mozzarella fresca, tomate, albahaca y pesto",
    precio: 55,
    categoria: "principal",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 140,
    orden_display: 2,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },
  {
    _id: "mi28",
    restaurante_id: "r6",
    nombre: "Cheesecake de Frutos Rojos",
    descripcion: "Cheesecake cremoso con coulis de frutos rojos",
    precio: 50,
    categoria: "postre",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 200,
    orden_display: 3,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },
  {
    _id: "mi29",
    restaurante_id: "r6",
    nombre: "Latte de Especialidad",
    descripcion: "Cafe latte con leche vaporizada y arte latte",
    precio: 35,
    categoria: "bebida",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 350,
    orden_display: 4,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },
  {
    _id: "mi30",
    restaurante_id: "r6",
    nombre: "Chocolate Caliente",
    descripcion: "Chocolate caliente guatemalteco con canela y marshmallows",
    precio: 30,
    categoria: "bebida",
    etiquetas: [],
    imagen:
      "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 180,
    orden_display: 5,
    fecha_creacion: "2025-02-15T06:00:00Z",
  },

  // Mariscos del Puerto (r7)
  {
    _id: "mi31",
    restaurante_id: "r7",
    nombre: "Ceviche Mixto",
    descripcion:
      "Ceviche fresco de camaron, pescado y pulpo con limon y cilantro",
    precio: 55,
    categoria: "entrada",
    etiquetas: ["sin_gluten", "mariscos"],
    imagen:
      "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 130,
    orden_display: 1,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
  {
    _id: "mi32",
    restaurante_id: "r7",
    nombre: "Pescado Frito Entero",
    descripcion: "Mojarra frita crujiente con arroz, ensalada y tajadas",
    precio: 95,
    categoria: "principal",
    etiquetas: ["sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 180,
    orden_display: 2,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
  {
    _id: "mi33",
    restaurante_id: "r7",
    nombre: "Camarones al Ajillo",
    descripcion:
      "Camarones salteados en mantequilla de ajo con guarnicion de arroz",
    precio: 110,
    categoria: "principal",
    etiquetas: ["sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 150,
    orden_display: 3,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
  {
    _id: "mi34",
    restaurante_id: "r7",
    nombre: "Coctel de Camarones",
    descripcion:
      "Camarones cocidos en salsa de tomate con cebolla, cilantro y aguacate",
    precio: 65,
    categoria: "entrada",
    etiquetas: ["sin_gluten"],
    imagen:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 100,
    orden_display: 4,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
  {
    _id: "mi35",
    restaurante_id: "r7",
    nombre: "Limonada de Coco",
    descripcion: "Limonada refrescante con leche de coco y hielo",
    precio: 25,
    categoria: "bebida",
    etiquetas: ["vegano"],
    imagen:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop",
    disponible: true,
    veces_ordenado: 80,
    orden_display: 5,
    fecha_creacion: "2025-03-01T08:00:00Z",
  },
];

// ---- Mock Orders ----

export const ordenesIniciales: Orden[] = [
  {
    _id: "o1",
    usuario_id: "u1",
    restaurante_id: "r1",
    items: [
      {
        item_id: "mi3",
        nombre: "Pizza Margherita",
        precio_unitario: 95,
        cantidad: 2,
        subtotal: 190,
      },
      {
        item_id: "mi2",
        nombre: "Pasta Carbonara",
        precio_unitario: 85,
        cantidad: 1,
        subtotal: 85,
      },
      {
        item_id: "mi5",
        nombre: "Limonada Italiana",
        precio_unitario: 25,
        cantidad: 2,
        subtotal: 50,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-12-01T12:00:00Z",
        actor_id: "u1",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-12-01T12:15:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2025-12-01T12:45:00Z",
        actor_id: "u4",
      },
      {
        estado: "entregado",
        timestamp: "2025-12-01T13:10:00Z",
        actor_id: "u4",
      },
    ],
    total: 325,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-12-01T12:00:00Z",
    fecha_entrega_real: "2025-12-01T13:10:00Z",
    tiene_resena: true,
  },
  {
    _id: "o1b",
    usuario_id: "u1",
    restaurante_id: "r2",
    items: [
      {
        item_id: "mi8",
        nombre: "BBQ Bacon Burger",
        precio_unitario: 85,
        cantidad: 1,
        subtotal: 85,
      },
      {
        item_id: "mi9",
        nombre: "Papas Fritas Clasicas",
        precio_unitario: 30,
        cantidad: 1,
        subtotal: 30,
      },
      {
        item_id: "mi11",
        nombre: "Limonada Natural",
        precio_unitario: 20,
        cantidad: 1,
        subtotal: 20,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-01-10T19:00:00Z",
        actor_id: "u1",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-01-10T19:10:00Z",
        actor_id: "u5",
      },
      {
        estado: "en_camino",
        timestamp: "2026-01-10T19:35:00Z",
        actor_id: "u5",
      },
      {
        estado: "entregado",
        timestamp: "2026-01-10T19:55:00Z",
        actor_id: "u5",
      },
    ],
    total: 135,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-01-10T19:00:00Z",
    fecha_entrega_real: "2026-01-10T19:55:00Z",
    tiene_resena: false,
  },
  {
    _id: "o2",
    usuario_id: "u2",
    restaurante_id: "r3",
    items: [
      {
        item_id: "mi12",
        nombre: "Dragon Roll",
        precio_unitario: 110,
        cantidad: 1,
        subtotal: 110,
      },
      {
        item_id: "mi13",
        nombre: "Salmon Sashimi",
        precio_unitario: 95,
        cantidad: 1,
        subtotal: 95,
      },
      {
        item_id: "mi16",
        nombre: "Te Verde",
        precio_unitario: 20,
        cantidad: 2,
        subtotal: 40,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-12-05T18:30:00Z",
        actor_id: "u2",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-12-05T18:45:00Z",
        actor_id: "u5",
      },
      {
        estado: "en_camino",
        timestamp: "2025-12-05T19:15:00Z",
        actor_id: "u5",
      },
      {
        estado: "entregado",
        timestamp: "2025-12-05T19:40:00Z",
        actor_id: "u5",
      },
    ],
    total: 245,
    direccion_entrega: {
      alias: "Casa",
      calle: "Blvd Los Proceres 24-69, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-12-05T18:30:00Z",
    fecha_entrega_real: "2025-12-05T19:40:00Z",
    tiene_resena: true,
  },
  {
    _id: "o3",
    usuario_id: "u3",
    restaurante_id: "r4",
    items: [
      {
        item_id: "mi18",
        nombre: "Tacos al Pastor",
        precio_unitario: 55,
        cantidad: 2,
        subtotal: 110,
      },
      {
        item_id: "mi17",
        nombre: "Guacamole con Totopos",
        precio_unitario: 35,
        cantidad: 1,
        subtotal: 35,
      },
      {
        item_id: "mi21",
        nombre: "Agua de Horchata",
        precio_unitario: 20,
        cantidad: 3,
        subtotal: 60,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-12-10T13:00:00Z",
        actor_id: "u3",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-12-10T13:10:00Z",
        actor_id: "u5",
      },
      {
        estado: "en_camino",
        timestamp: "2025-12-10T13:35:00Z",
        actor_id: "u5",
      },
      {
        estado: "entregado",
        timestamp: "2025-12-10T14:00:00Z",
        actor_id: "u5",
      },
    ],
    total: 205,
    direccion_entrega: {
      alias: "Casa",
      calle: "12 Calle 1-25, Zona 1",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-12-10T13:00:00Z",
    fecha_entrega_real: "2025-12-10T14:00:00Z",
    tiene_resena: true,
  },
  {
    _id: "o4",
    usuario_id: "u1",
    restaurante_id: "r2",
    items: [
      {
        item_id: "mi7",
        nombre: "Classic Smash Burger",
        precio_unitario: 75,
        cantidad: 2,
        subtotal: 150,
      },
      {
        item_id: "mi9",
        nombre: "Papas con Queso",
        precio_unitario: 40,
        cantidad: 1,
        subtotal: 40,
      },
      {
        item_id: "mi10",
        nombre: "Milkshake de Oreo",
        precio_unitario: 35,
        cantidad: 2,
        subtotal: 70,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-12-15T19:00:00Z",
        actor_id: "u1",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-12-15T19:10:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2025-12-15T19:40:00Z",
        actor_id: "u4",
      },
      {
        estado: "entregado",
        timestamp: "2025-12-15T20:05:00Z",
        actor_id: "u4",
      },
    ],
    total: 260,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-12-15T19:00:00Z",
    fecha_entrega_real: "2025-12-15T20:05:00Z",
    tiene_resena: true,
  },
  {
    _id: "o5",
    usuario_id: "u9",
    restaurante_id: "r6",
    items: [
      {
        item_id: "mi29",
        nombre: "Latte de Especialidad",
        precio_unitario: 35,
        cantidad: 2,
        subtotal: 70,
      },
      {
        item_id: "mi28",
        nombre: "Cheesecake de Frutos Rojos",
        precio_unitario: 50,
        cantidad: 1,
        subtotal: 50,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-12-18T10:00:00Z",
        actor_id: "u9",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-12-18T10:05:00Z",
        actor_id: "u6",
      },
      {
        estado: "en_camino",
        timestamp: "2025-12-18T10:25:00Z",
        actor_id: "u6",
      },
      {
        estado: "entregado",
        timestamp: "2025-12-18T10:45:00Z",
        actor_id: "u6",
      },
    ],
    total: 120,
    direccion_entrega: {
      alias: "Casa",
      calle: "10a Calle 5-20, Zona 13",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-12-18T10:00:00Z",
    fecha_entrega_real: "2025-12-18T10:45:00Z",
    tiene_resena: false,
  },
  {
    _id: "o6",
    usuario_id: "u10",
    restaurante_id: "r2",
    items: [
      {
        item_id: "mi8",
        nombre: "BBQ Bacon Burger",
        precio_unitario: 85,
        cantidad: 1,
        subtotal: 85,
      },
      {
        item_id: "mi6",
        nombre: "Aros de Cebolla",
        precio_unitario: 35,
        cantidad: 1,
        subtotal: 35,
      },
    ],
    estado: "en_proceso",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-01-15T13:00:00Z",
        actor_id: "u10",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-01-15T13:10:00Z",
        actor_id: "u4",
      },
    ],
    total: 120,
    direccion_entrega: {
      alias: "Casa",
      calle: "2a Avenida 9-30, Zona 9",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-01-15T13:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o7",
    usuario_id: "u1",
    restaurante_id: "r5",
    items: [
      {
        item_id: "mi23",
        nombre: "Buddha Bowl",
        precio_unitario: 75,
        cantidad: 1,
        subtotal: 75,
      },
      {
        item_id: "mi25",
        nombre: "Smoothie de Frutas",
        precio_unitario: 30,
        cantidad: 1,
        subtotal: 30,
      },
    ],
    estado: "pendiente",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-02-01T12:30:00Z",
        actor_id: "u1",
      },
    ],
    total: 105,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-02-01T12:30:00Z",
    tiene_resena: false,
  },
  {
    _id: "o8",
    usuario_id: "u2",
    restaurante_id: "r5",
    items: [
      {
        item_id: "mi22",
        nombre: "Sopa de Lentejas",
        precio_unitario: 35,
        cantidad: 1,
        subtotal: 35,
      },
      {
        item_id: "mi24",
        nombre: "Wrap Mediterraneo",
        precio_unitario: 65,
        cantidad: 2,
        subtotal: 130,
      },
    ],
    estado: "en_camino",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-02-10T11:00:00Z",
        actor_id: "u2",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-02-10T11:10:00Z",
        actor_id: "u6",
      },
      {
        estado: "en_camino",
        timestamp: "2026-02-10T11:35:00Z",
        actor_id: "u6",
      },
    ],
    total: 165,
    direccion_entrega: {
      alias: "Casa",
      calle: "Blvd Los Proceres 24-69, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-02-10T11:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o9",
    usuario_id: "u3",
    restaurante_id: "r7",
    items: [
      {
        item_id: "mi31",
        nombre: "Ceviche Mixto",
        precio_unitario: 55,
        cantidad: 1,
        subtotal: 55,
      },
      {
        item_id: "mi32",
        nombre: "Pescado Frito Entero",
        precio_unitario: 95,
        cantidad: 1,
        subtotal: 95,
      },
      {
        item_id: "mi35",
        nombre: "Limonada de Coco",
        precio_unitario: 25,
        cantidad: 2,
        subtotal: 50,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-01-20T14:00:00Z",
        actor_id: "u3",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-01-20T14:15:00Z",
        actor_id: "u6",
      },
      {
        estado: "en_camino",
        timestamp: "2026-01-20T14:45:00Z",
        actor_id: "u6",
      },
      {
        estado: "entregado",
        timestamp: "2026-01-20T15:15:00Z",
        actor_id: "u6",
      },
    ],
    total: 200,
    direccion_entrega: {
      alias: "Casa",
      calle: "12 Calle 1-25, Zona 1",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-01-20T14:00:00Z",
    fecha_entrega_real: "2026-01-20T15:15:00Z",
    tiene_resena: true,
  },
  {
    _id: "o10",
    usuario_id: "u9",
    restaurante_id: "r1",
    items: [
      {
        item_id: "mi1",
        nombre: "Bruschetta Clasica",
        precio_unitario: 45,
        cantidad: 1,
        subtotal: 45,
      },
      {
        item_id: "mi4",
        nombre: "Tiramisu",
        precio_unitario: 55,
        cantidad: 2,
        subtotal: 110,
      },
      {
        item_id: "mi5",
        nombre: "Limonada Italiana",
        precio_unitario: 25,
        cantidad: 1,
        subtotal: 25,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-01-25T17:00:00Z",
        actor_id: "u9",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-01-25T17:10:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2026-01-25T17:40:00Z",
        actor_id: "u4",
      },
      {
        estado: "entregado",
        timestamp: "2026-01-25T18:00:00Z",
        actor_id: "u4",
      },
    ],
    total: 180,
    direccion_entrega: {
      alias: "Casa",
      calle: "10a Calle 5-20, Zona 13",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-01-25T17:00:00Z",
    fecha_entrega_real: "2026-01-25T18:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o11",
    usuario_id: "u10",
    restaurante_id: "r4",
    items: [
      {
        item_id: "mi19",
        nombre: "Burrito Supremo",
        precio_unitario: 65,
        cantidad: 2,
        subtotal: 130,
      },
      {
        item_id: "mi20",
        nombre: "Churros con Chocolate",
        precio_unitario: 30,
        cantidad: 1,
        subtotal: 30,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-02-05T20:00:00Z",
        actor_id: "u10",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-02-05T20:10:00Z",
        actor_id: "u5",
      },
      {
        estado: "en_camino",
        timestamp: "2026-02-05T20:40:00Z",
        actor_id: "u5",
      },
      {
        estado: "entregado",
        timestamp: "2026-02-05T21:00:00Z",
        actor_id: "u5",
      },
    ],
    total: 160,
    direccion_entrega: {
      alias: "Casa",
      calle: "2a Avenida 9-30, Zona 9",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-02-05T20:00:00Z",
    fecha_entrega_real: "2026-02-05T21:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o12",
    usuario_id: "u1",
    restaurante_id: "r3",
    items: [
      {
        item_id: "mi14",
        nombre: "Ramen Tonkotsu",
        precio_unitario: 85,
        cantidad: 1,
        subtotal: 85,
      },
      {
        item_id: "mi11",
        nombre: "Edamame",
        precio_unitario: 30,
        cantidad: 1,
        subtotal: 30,
      },
    ],
    estado: "cancelado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-02-12T19:00:00Z",
        actor_id: "u1",
      },
      {
        estado: "cancelado",
        timestamp: "2026-02-12T19:05:00Z",
        actor_id: "u1",
        nota: "Cambio de planes",
      },
    ],
    total: 115,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-02-12T19:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o13",
    usuario_id: "u2",
    restaurante_id: "r6",
    items: [
      {
        item_id: "mi26",
        nombre: "Tostada de Aguacate",
        precio_unitario: 45,
        cantidad: 1,
        subtotal: 45,
      },
      {
        item_id: "mi29",
        nombre: "Latte de Especialidad",
        precio_unitario: 35,
        cantidad: 1,
        subtotal: 35,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-01-10T08:00:00Z",
        actor_id: "u2",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-01-10T08:05:00Z",
        actor_id: "u6",
      },
      {
        estado: "en_camino",
        timestamp: "2026-01-10T08:25:00Z",
        actor_id: "u6",
      },
      {
        estado: "entregado",
        timestamp: "2026-01-10T08:45:00Z",
        actor_id: "u6",
      },
    ],
    total: 80,
    direccion_entrega: {
      alias: "Casa",
      calle: "Blvd Los Proceres 24-69, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-01-10T08:00:00Z",
    fecha_entrega_real: "2026-01-10T08:45:00Z",
    tiene_resena: true,
  },
  {
    _id: "o14",
    usuario_id: "u3",
    restaurante_id: "r2",
    items: [
      {
        item_id: "mi7",
        nombre: "Classic Smash Burger",
        precio_unitario: 75,
        cantidad: 3,
        subtotal: 225,
      },
      {
        item_id: "mi6",
        nombre: "Aros de Cebolla",
        precio_unitario: 35,
        cantidad: 2,
        subtotal: 70,
      },
      {
        item_id: "mi10",
        nombre: "Milkshake de Oreo",
        precio_unitario: 35,
        cantidad: 3,
        subtotal: 105,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-02-20T12:00:00Z",
        actor_id: "u3",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-02-20T12:10:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2026-02-20T12:40:00Z",
        actor_id: "u4",
      },
      {
        estado: "entregado",
        timestamp: "2026-02-20T13:05:00Z",
        actor_id: "u4",
      },
    ],
    total: 400,
    direccion_entrega: {
      alias: "Casa",
      calle: "12 Calle 1-25, Zona 1",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-02-20T12:00:00Z",
    fecha_entrega_real: "2026-02-20T13:05:00Z",
    tiene_resena: false,
  },
  {
    _id: "o15",
    usuario_id: "u10",
    restaurante_id: "r1",
    items: [
      {
        item_id: "mi3",
        nombre: "Pizza Margherita",
        precio_unitario: 95,
        cantidad: 1,
        subtotal: 95,
      },
      {
        item_id: "mi2",
        nombre: "Pasta Carbonara",
        precio_unitario: 85,
        cantidad: 1,
        subtotal: 85,
      },
    ],
    estado: "en_camino",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-03-01T18:00:00Z",
        actor_id: "u10",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-03-01T18:10:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2026-03-01T18:40:00Z",
        actor_id: "u4",
      },
    ],
    total: 180,
    direccion_entrega: {
      alias: "Casa",
      calle: "2a Avenida 9-30, Zona 9",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-03-01T18:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o16",
    usuario_id: "u1",
    restaurante_id: "r6",
    items: [
      {
        item_id: "mi30",
        nombre: "Chocolate Caliente",
        precio_unitario: 30,
        cantidad: 2,
        subtotal: 60,
      },
      {
        item_id: "mi28",
        nombre: "Cheesecake de Frutos Rojos",
        precio_unitario: 50,
        cantidad: 1,
        subtotal: 50,
      },
    ],
    estado: "pendiente",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-03-03T09:00:00Z",
        actor_id: "u1",
      },
    ],
    total: 110,
    direccion_entrega: {
      alias: "Casa",
      calle: "4a Avenida 12-34, Zona 10",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-03-03T09:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o17",
    usuario_id: "u9",
    restaurante_id: "r3",
    items: [
      {
        item_id: "mi12",
        nombre: "Dragon Roll",
        precio_unitario: 110,
        cantidad: 2,
        subtotal: 220,
      },
      {
        item_id: "mi15",
        nombre: "Mochi de Matcha",
        precio_unitario: 45,
        cantidad: 1,
        subtotal: 45,
      },
    ],
    estado: "en_proceso",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2026-03-02T20:00:00Z",
        actor_id: "u9",
      },
      {
        estado: "en_proceso",
        timestamp: "2026-03-02T20:10:00Z",
        actor_id: "u5",
      },
    ],
    total: 265,
    direccion_entrega: {
      alias: "Casa",
      calle: "10a Calle 5-20, Zona 13",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2026-03-02T20:00:00Z",
    tiene_resena: false,
  },
  {
    _id: "o18",
    usuario_id: "u3",
    restaurante_id: "r1",
    items: [
      {
        item_id: "mi1",
        nombre: "Bruschetta Clasica",
        precio_unitario: 45,
        cantidad: 2,
        subtotal: 90,
      },
      {
        item_id: "mi3",
        nombre: "Pizza Margherita",
        precio_unitario: 95,
        cantidad: 1,
        subtotal: 95,
      },
      {
        item_id: "mi4",
        nombre: "Tiramisu",
        precio_unitario: 55,
        cantidad: 1,
        subtotal: 55,
      },
    ],
    estado: "entregado",
    historial_estados: [
      {
        estado: "pendiente",
        timestamp: "2025-11-20T13:00:00Z",
        actor_id: "u3",
      },
      {
        estado: "en_proceso",
        timestamp: "2025-11-20T13:10:00Z",
        actor_id: "u4",
      },
      {
        estado: "en_camino",
        timestamp: "2025-11-20T13:40:00Z",
        actor_id: "u4",
      },
      {
        estado: "entregado",
        timestamp: "2025-11-20T14:05:00Z",
        actor_id: "u4",
      },
    ],
    total: 240,
    direccion_entrega: {
      alias: "Casa",
      calle: "12 Calle 1-25, Zona 1",
      ciudad: "Guatemala",
      pais: "GT",
    },
    fecha_creacion: "2025-11-20T13:00:00Z",
    fecha_entrega_real: "2025-11-20T14:05:00Z",
    tiene_resena: true,
  },
];

// ---- Mock Reviews ----

export const resenasIniciales: Resena[] = [
  {
    _id: "re1",
    usuario_id: "u1",
    restaurante_id: "r1",
    orden_id: "o1",
    calificacion: 5,
    titulo: "Increible pizza!",
    comentario:
      "La mejor pizza que he probado en Guatemala. La masa artesanal y los ingredientes frescos hacen toda la diferencia. Definitivamente regresare.",
    tags: ["sabroso", "buena_presentacion", "buen_servicio"],
    likes: ["u2", "u3", "u9"],
    activa: true,
    fecha: "2025-12-02T10:00:00Z",
  },
  {
    _id: "re2",
    usuario_id: "u2",
    restaurante_id: "r3",
    orden_id: "o2",
    calificacion: 5,
    titulo: "Sushi de primera calidad",
    comentario:
      "El Dragon Roll es espectacular y el sashimi es fresco como si estuvieramos en Japon. El te verde complementa perfecto. Servicio impecable.",
    tags: ["sabroso", "fresco", "buena_presentacion", "buen_servicio"],
    likes: ["u1", "u3", "u9", "u10"],
    activa: true,
    fecha: "2025-12-06T11:00:00Z",
  },
  {
    _id: "re3",
    usuario_id: "u3",
    restaurante_id: "r4",
    orden_id: "o3",
    calificacion: 4,
    titulo: "Tacos muy buenos",
    comentario:
      "Los tacos al pastor son muy sabrosos y la horchata esta perfecta. El guacamole podria tener mas sabor pero en general excelente experiencia.",
    tags: ["sabroso", "rapido", "precio_justo"],
    likes: ["u1", "u2"],
    activa: true,
    fecha: "2025-12-11T09:00:00Z",
  },
  {
    _id: "re4",
    usuario_id: "u1",
    restaurante_id: "r2",
    orden_id: "o4",
    calificacion: 4,
    titulo: "Hamburguesas de calidad",
    comentario:
      "La Classic Smash Burger es genial, la carne se nota que es angus de calidad. Las papas con queso son adictivas. Un poco caro pero vale la pena.",
    tags: ["sabroso", "porciones_grandes"],
    likes: ["u3", "u10"],
    activa: true,
    fecha: "2025-12-16T14:00:00Z",
  },
  {
    _id: "re5",
    usuario_id: "u3",
    restaurante_id: "r7",
    orden_id: "o9",
    calificacion: 5,
    titulo: "Mariscos fresquisimos",
    comentario:
      "El ceviche mixto esta increible y el pescado frito es como comer en la playa. La limonada de coco es el complemento perfecto. Altamente recomendado.",
    tags: ["sabroso", "fresco", "porciones_grandes", "precio_justo"],
    likes: ["u1", "u2", "u9"],
    activa: true,
    fecha: "2026-01-21T10:00:00Z",
  },
  {
    _id: "re6",
    usuario_id: "u2",
    restaurante_id: "r6",
    orden_id: "o13",
    calificacion: 5,
    titulo: "El mejor cafe de la ciudad",
    comentario:
      "La tostada de aguacate con huevo pochado esta divina y el latte es perfecto. El ambiente del lugar es super acogedor, ideal para trabajar.",
    tags: [
      "sabroso",
      "ambiente_agradable",
      "buen_servicio",
      "buena_presentacion",
    ],
    likes: ["u1", "u9", "u10"],
    activa: true,
    fecha: "2026-01-11T12:00:00Z",
  },
  {
    _id: "re7",
    usuario_id: "u10",
    restaurante_id: "r2",
    calificacion: 3,
    titulo: "Bueno pero tardo mucho",
    comentario:
      "La comida estuvo buena pero tardaron casi una hora en entregar. La hamburguesa llego un poco fria. Espero que mejoren los tiempos.",
    tags: ["sabroso"],
    likes: [],
    activa: true,
    fecha: "2026-01-16T15:00:00Z",
  },
  {
    _id: "re8",
    usuario_id: "u9",
    restaurante_id: "r1",
    calificacion: 4,
    titulo: "Delicioso tiramisu",
    comentario:
      "La bruschetta es fresca y el tiramisu es de los mejores que he probado. El servicio fue amable y rapido. Recomendado para una cena especial.",
    tags: ["sabroso", "buen_servicio", "buena_presentacion"],
    likes: ["u1", "u3"],
    activa: true,
    fecha: "2026-01-26T20:00:00Z",
  },
  {
    _id: "re9",
    usuario_id: "u1",
    restaurante_id: "r5",
    calificacion: 4,
    titulo: "Saludable y rico",
    comentario:
      "El Buddha Bowl esta muy completo y fresco. Es dificil encontrar opciones saludables que sean tan sabrosas. El smoothie tambien muy bueno.",
    tags: ["sabroso", "fresco", "saludable", "precio_justo"],
    likes: ["u2"],
    activa: true,
    fecha: "2026-02-02T16:00:00Z",
  },
  {
    _id: "re10",
    usuario_id: "u3",
    restaurante_id: "r1",
    orden_id: "o18",
    calificacion: 5,
    titulo: "Siempre consistente",
    comentario:
      "Cada vez que vengo la calidad es la misma. La pizza margherita y la bruschetta son un clasico que nunca falla. Gran lugar para comer italiano en Guatemala.",
    tags: ["sabroso", "buen_servicio", "ambiente_agradable"],
    likes: ["u1", "u2", "u9", "u10"],
    activa: true,
    fecha: "2025-11-21T18:00:00Z",
  },
  {
    _id: "re11",
    usuario_id: "u10",
    restaurante_id: "r4",
    calificacion: 4,
    titulo: "Burritos enormes",
    comentario:
      "El burrito supremo es enorme y muy bueno. Los churros con chocolate son perfectos para el postre. Buen lugar para comida mexicana casual.",
    tags: ["porciones_grandes", "sabroso", "precio_justo"],
    likes: ["u3"],
    activa: true,
    fecha: "2026-02-06T22:00:00Z",
  },
  {
    _id: "re12",
    usuario_id: "u9",
    restaurante_id: "r6",
    calificacion: 5,
    titulo: "Mi lugar favorito",
    comentario:
      "Vengo aqui casi todas las semanas. El cheesecake es adictivo y el chocolate caliente guatemalteco es unico. El personal siempre amable.",
    tags: ["sabroso", "ambiente_agradable", "buen_servicio", "limpio"],
    likes: ["u1", "u2", "u3"],
    activa: true,
    fecha: "2025-12-19T14:00:00Z",
  },
];
