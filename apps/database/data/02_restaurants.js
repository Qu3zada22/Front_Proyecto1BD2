// ownersByName: Map<string, ObjectId>  obtenido de DB después de insertar usuarios.
// MongoDB asigna _id a cada restaurante al insertar.

const d = (iso) => new Date(iso)

const horarioNormal = { abre: '11:00', cierra: '22:00', cerrado: false }
const horarioCafe   = { abre: '07:00', cierra: '20:00', cerrado: false }
const domingo       = { abre: '12:00', cierra: '21:00', cerrado: false }
const cerrado       = { abre: null,    cierra: null,     cerrado: true  }

export function buildRestaurants(ownersByName) {
  return [
    // ── Roberto Mendoza Vásquez ────────────────────────────
    {
      propietario_id: ownersByName.get('Roberto Mendoza Vásquez'),
      nombre: 'El Portal Chapín',
      descripcion: 'Auténtica cocina guatemalteca con recetas tradicionales de la abuela. Sabores únicos del altiplano y la costa.',
      ubicacion: { type: 'Point', coordinates: [-90.5133, 14.6418] },
      direccion: { calle: '1a Avenida 9-15', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01001' },
      categorias: ['guatemalteca', 'tradicional', 'familiar'],
      horario: {
        lunes: horarioNormal, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '11:00', cierra: '23:00', cerrado: false },
        sabado: { abre: '10:00', cierra: '23:00', cerrado: false }, domingo,
      },
      telefono: '+502 2222-0001',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-06-15'),
    },
    {
      propietario_id: ownersByName.get('Roberto Mendoza Vásquez'),
      nombre: 'La Bella Italia',
      descripcion: 'Pastas frescas, pizzas artesanales y postres italianos clásicos en el corazón de la Zona Viva.',
      ubicacion: { type: 'Point', coordinates: [-90.5064, 14.6048] },
      direccion: { calle: '4a Avenida 8-32 Zona 10', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01010' },
      categorias: ['italiana', 'pastas', 'pizzas'],
      horario: {
        lunes: cerrado, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '12:00', cierra: '23:00', cerrado: false },
        sabado: { abre: '12:00', cierra: '23:00', cerrado: false }, domingo,
      },
      telefono: '+502 2222-0002',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-07-01'),
    },

    // ── Lucía Hernández Ruiz ───────────────────────────────
    {
      propietario_id: ownersByName.get('Lucía Hernández Ruiz'),
      nombre: 'Burger House GT',
      descripcion: 'Las mejores hamburguesas artesanales de Guatemala. Carne 100% nacional, ingredientes frescos, sabor insuperable.',
      ubicacion: { type: 'Point', coordinates: [-90.5138, 14.6042] },
      direccion: { calle: '7a Avenida 4-51 Zona 9', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01009' },
      categorias: ['americana', 'hamburguesas', 'comida_rapida'],
      horario: {
        lunes: horarioNormal, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '10:00', cierra: '23:30', cerrado: false },
        sabado: { abre: '10:00', cierra: '23:30', cerrado: false }, domingo,
      },
      telefono: '+502 2222-0003',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-08-10'),
    },
    {
      propietario_id: ownersByName.get('Lucía Hernández Ruiz'),
      nombre: 'Sushi Zen',
      descripcion: 'Experiencia japonesa auténtica. Sushi fresco, sashimi premium y sake seleccionado para los amantes de la cocina nipona.',
      ubicacion: { type: 'Point', coordinates: [-90.4941, 14.5956] },
      direccion: { calle: '18 Avenida 3-50 Zona 14', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01014' },
      categorias: ['japonesa', 'sushi', 'asiática'],
      horario: {
        lunes: cerrado, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '12:00', cierra: '23:00', cerrado: false },
        sabado: { abre: '12:00', cierra: '23:00', cerrado: false },
        domingo: { abre: '12:00', cierra: '22:00', cerrado: false },
      },
      telefono: '+502 2222-0004',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-09-05'),
    },

    // ── Pablo Godínez Ajú ──────────────────────────────────
    {
      propietario_id: ownersByName.get('Pablo Godínez Ajú'),
      nombre: 'El Rincón Vegano',
      descripcion: 'Cocina vegana y plant-based de alta calidad. Ingredientes orgánicos locales, sin ningún producto de origen animal.',
      ubicacion: { type: 'Point', coordinates: [-90.5188, 14.6178] },
      direccion: { calle: 'Ruta 6, 3-45 Zona 4', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01004' },
      categorias: ['vegana', 'saludable', 'organica'],
      horario: {
        lunes: horarioNormal, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: horarioNormal,
        sabado: { abre: '09:00', cierra: '21:00', cerrado: false },
        domingo: { abre: '09:00', cierra: '18:00', cerrado: false },
      },
      telefono: '+502 2222-0005',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-10-01'),
    },
    {
      propietario_id: ownersByName.get('Pablo Godínez Ajú'),
      nombre: 'Tacos & More',
      descripcion: 'Sabores mexicanos auténticos: tacos al pastor, burritos, guacamole fresco y más. La mejor comida tex-mex en Guatemala.',
      ubicacion: { type: 'Point', coordinates: [-90.5416, 14.6188] },
      direccion: { calle: 'Calzada Roosevelt 22-10 Zona 11', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01011' },
      categorias: ['mexicana', 'tacos', 'tex-mex'],
      horario: {
        lunes: horarioNormal, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '11:00', cierra: '23:00', cerrado: false },
        sabado: { abre: '11:00', cierra: '23:00', cerrado: false }, domingo,
      },
      telefono: '+502 2222-0006',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-11-15'),
    },

    // ── Carmen Estrada Xol ─────────────────────────────────
    {
      propietario_id: ownersByName.get('Carmen Estrada Xol'),
      nombre: 'Mariscos del Pacífico',
      descripcion: 'Pescado y mariscos frescos traídos directamente del Pacífico guatemalteco. Ceviche, camarones y parrilladas de mar.',
      ubicacion: { type: 'Point', coordinates: [-90.5319, 14.5894] },
      direccion: { calle: 'Avenida Hincapié 8-15 Zona 13', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01013' },
      categorias: ['mariscos', 'pescados', 'ceviche'],
      horario: {
        lunes: horarioNormal, martes: horarioNormal, miercoles: horarioNormal,
        jueves: horarioNormal, viernes: { abre: '10:00', cierra: '22:00', cerrado: false },
        sabado: { abre: '10:00', cierra: '22:00', cerrado: false },
        domingo: { abre: '10:00', cierra: '20:00', cerrado: false },
      },
      telefono: '+502 2222-0007',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2022-12-01'),
    },
    {
      propietario_id: ownersByName.get('Carmen Estrada Xol'),
      nombre: 'Café Central',
      descripcion: 'El mejor café guatemalteco de altura acompañado de desayunos chapines, waffles y pasteles artesanales.',
      ubicacion: { type: 'Point', coordinates: [-90.484, 14.5891] },
      direccion: { calle: 'Avenida La Reforma 15-54 Zona 15', ciudad: 'Guatemala City', pais: 'Guatemala', codigo_postal: '01015' },
      categorias: ['cafeteria', 'desayunos', 'postres'],
      horario: {
        lunes: horarioCafe, martes: horarioCafe, miercoles: horarioCafe,
        jueves: horarioCafe, viernes: horarioCafe,
        sabado: { abre: '07:00', cierra: '21:00', cerrado: false },
        domingo: { abre: '08:00', cierra: '18:00', cerrado: false },
      },
      telefono: '+502 2222-0008',
      img_portada_id: null,
      calificacion_prom: 0,
      total_resenas: 0,
      activo: true,
      fecha_creacion: d('2023-01-10'),
    },
  ]
}
