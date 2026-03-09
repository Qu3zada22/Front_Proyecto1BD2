/**
 * Aggregation pipelines y operadores de arrays para verify.js
 *
 * Cada función recibe la instancia db (Db de mongodb driver) como primer argumento.
 */

// ── Agregaciones simples ─────────────────────────────────────────────────────

export async function count(db, collection, filter = {}) {
  return db.collection(collection).countDocuments(filter)
}

export async function distinct(db, collection, field, filter = {}) {
  return db.collection(collection).distinct(field, filter)
}

// ── Pipelines complejos ──────────────────────────────────────────────────────

/** P1 — Revenue por restaurante (solo órdenes entregadas) */
export async function revenueByRestaurant(db) {
  return db.collection('ordenes').aggregate([
    { $match: { estado: 'entregado' } },
    {
      $group: {
        _id: '$restaurante_id',
        total_revenue: { $sum: { $toDecimal: '$total' } },
        num_ordenes: { $sum: 1 },
        ticket_prom: { $avg: { $toDecimal: '$total' } },
      },
    },
    { $sort: { total_revenue: -1 } },
    {
      $lookup: {
        from: 'restaurantes',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        total_revenue: 1,
        num_ordenes: 1,
        ticket_prom: { $round: ['$ticket_prom', 2] },
        _id: 0,
      },
    },
  ]).toArray()
}

/** P2 — Top N menu items más ordenados */
export async function topMenuItems(db, limit = 10) {
  return db.collection('ordenes').aggregate([
    { $match: { estado: 'entregado' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.item_id',
        item: { $first: '$items.nombre' },
        veces_ordenado: { $sum: '$items.cantidad' },
        precio: { $first: { $ifNull: ['$items.precio', '$items.precio_unitario'] } },
        restaurante_id: { $first: '$restaurante_id' },
      },
    },
    { $sort: { veces_ordenado: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'restaurantes',
        localField: 'restaurante_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        item: 1,
        veces_ordenado: 1,
        precio: 1,
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        _id: 0,
      },
    },
  ]).toArray()
}

/** P3 — Restaurantes con rating real (desde reseñas, no campo desnormalizado) */
export async function restaurantesConRating(db) {
  return db.collection('resenas').aggregate([
    { $match: { activa: true, restaurante_id: { $exists: true } } },
    {
      $group: {
        _id: '$restaurante_id',
        rating_real: { $avg: '$calificacion' },
        resenas_activas: { $sum: 1 },
      },
    },
    { $sort: { rating_real: -1 } },
    {
      $lookup: {
        from: 'restaurantes',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        nombre: { $arrayElemAt: ['$rest.nombre', 0] },
        rating_real: { $round: ['$rating_real', 1] },
        resenas_activas: 1,
        _id: 0,
      },
    },
  ]).toArray()
}

/** P4 — Distribución de calificaciones por restaurante */
export async function distribucionCalificaciones(db) {
  return db.collection('resenas').aggregate([
    { $match: { activa: true, restaurante_id: { $exists: true } } },
    {
      $group: {
        _id: { restaurante_id: '$restaurante_id', calificacion: '$calificacion' },
        cantidad: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.restaurante_id',
        breakdown: {
          $push: { calificacion: '$_id.calificacion', cantidad: '$cantidad' },
        },
      },
    },
    {
      $lookup: {
        from: 'restaurantes',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        breakdown: 1,
        _id: 0,
      },
    },
    { $sort: { restaurante: 1 } },
  ]).toArray()
}

/** P5 — Top N clientes más activos */
export async function clientesMasActivos(db, limit = 5) {
  return db.collection('ordenes').aggregate([
    { $match: { estado: 'entregado' } },
    {
      $group: {
        _id: '$usuario_id',
        total_ordenes: { $sum: 1 },
        total_gastado: { $sum: { $toDecimal: '$total' } },
      },
    },
    { $sort: { total_ordenes: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'usuarios',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'user',
      },
    },
    {
      $project: {
        cliente: { $arrayElemAt: ['$user.nombre', 0] },
        total_ordenes: 1,
        total_gastado: 1,
        _id: 0,
      },
    },
  ]).toArray()
}

/** P6 — Top N reseñas con más likes */
export async function topResenasPorLikes(db, limit = 5) {
  return db.collection('resenas').aggregate([
    { $match: { activa: true } },
    { $addFields: { num_likes: { $size: { $ifNull: ['$likes', []] } } } },
    { $sort: { num_likes: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'usuarios',
        localField: 'usuario_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'user',
      },
    },
    {
      $lookup: {
        from: 'restaurantes',
        localField: 'restaurante_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        titulo: 1,
        calificacion: 1,
        num_likes: 1,
        autor: { $arrayElemAt: ['$user.nombre', 0] },
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        _id: 0,
      },
    },
  ]).toArray()
}

/** P7 — Estados de órdenes por restaurante */
export async function estadosOrdenesporRestaurante(db) {
  return db.collection('ordenes').aggregate([
    {
      $group: {
        _id: { restaurante_id: '$restaurante_id', estado: '$estado' },
        total: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.restaurante_id',
        estados: { $push: { estado: '$_id.estado', total: '$total' } },
        total_ordenes: { $sum: '$total' },
      },
    },
    {
      $lookup: {
        from: 'restaurantes',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        estados: 1,
        total_ordenes: 1,
        _id: 0,
      },
    },
    { $sort: { total_ordenes: -1 } },
  ]).toArray()
}

/** P8 — Items veganos disponibles por restaurante */
export async function itemsVeganosPorRestaurante(db) {
  return db.collection('menu_items').aggregate([
    { $match: { disponible: true, etiquetas: 'vegano' } },
    {
      $group: {
        _id: '$restaurante_id',
        items: { $push: { nombre: '$nombre', categoria: '$categoria', precio: '$precio' } },
        total_items_veganos: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'restaurantes',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { nombre: 1, _id: 0 } }],
        as: 'rest',
      },
    },
    {
      $project: {
        restaurante: { $arrayElemAt: ['$rest.nombre', 0] },
        items: 1,
        total_items_veganos: 1,
        _id: 0,
      },
    },
    { $sort: { total_items_veganos: -1 } },
  ]).toArray()
}

/** Restaurantes cercanos a un punto (2dsphere) */
export async function restaurantesCercanos(db, lng, lat, maxDistMetros = 3000) {
  return db.collection('restaurantes').find({
    ubicacion: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistMetros,
      },
    },
  }).toArray()
}

// ── Operadores de arrays y documentos embebidos ──────────────────────────────

/** $push — agregar dirección embebida a usuario */
export async function pushDireccion(db, userId, direccion) {
  return db.collection('usuarios').updateOne(
    { _id: userId },
    { $push: { direcciones: direccion } },
  )
}

/** $pull — eliminar dirección por alias */
export async function pullDireccion(db, userId, alias) {
  return db.collection('usuarios').updateOne(
    { _id: userId },
    { $pull: { direcciones: { alias } } },
  )
}

/** $addToSet — agregar preferencia sin duplicados */
export async function addSetPreferencia(db, userId, preferencia) {
  return db.collection('usuarios').updateOne(
    { _id: userId },
    { $addToSet: { preferencias: preferencia } },
  )
}

/** $addToSet — agregar like a reseña sin duplicados */
export async function addSetLike(db, resenaId, userId) {
  return db.collection('resenas').updateOne(
    { _id: resenaId },
    { $addToSet: { likes: userId } },
  )
}

/** $pull — quitar like de reseña */
export async function pullLike(db, resenaId, userId) {
  return db.collection('resenas').updateOne(
    { _id: resenaId },
    { $pull: { likes: userId } },
  )
}
