/**
 * Crea todos los índices requeridos por colección.
 * Tipos cubiertos: simple, único, compuesto, multikey, 2dsphere, texto.
 */
export async function createAllIndexes(db) {
  await createUserIndexes(db)
  await createRestaurantIndexes(db)
  await createMenuItemIndexes(db)
  await createOrderIndexes(db)
  await createReviewIndexes(db)
}

async function createUserIndexes(db) {
  const col = db.collection('usuarios')
  await Promise.all([
    // Único sobre email
    col.createIndex({ email: 1 }, { unique: true, name: 'email_unique' }),
    // Multikey sobre direcciones.ciudad
    col.createIndex({ 'direcciones.ciudad': 1 }, { name: 'direcciones_ciudad_multikey' }),
    // Texto sobre nombre
    col.createIndex({ nombre: 'text' }, { name: 'nombre_text' }),
    // Simple sobre rol
    col.createIndex({ rol: 1 }, { name: 'rol_simple' }),
  ])
  console.log('  [OK] usuarios indexes')
}

async function createRestaurantIndexes(db) {
  const col = db.collection('restaurantes')
  await Promise.all([
    // 2dsphere sobre ubicacion (geoespacial)
    col.createIndex({ ubicacion: '2dsphere' }, { name: 'ubicacion_2dsphere' }),
    // Multikey sobre categorias
    col.createIndex({ categorias: 1 }, { name: 'categorias_multikey' }),
    // Compuesto propietario_id + activo
    col.createIndex({ propietario_id: 1, activo: 1 }, { name: 'propietario_activo_compound' }),
    // Simple descendente sobre calificacion_prom
    col.createIndex({ calificacion_prom: -1 }, { name: 'calificacion_prom_desc' }),
    // Texto sobre nombre y descripcion
    col.createIndex({ nombre: 'text', descripcion: 'text' }, { name: 'nombre_descripcion_text' }),
  ])
  console.log('  [OK] restaurantes indexes')
}

async function createMenuItemIndexes(db) {
  const col = db.collection('menu_items')
  await Promise.all([
    // Compuesto ESR: restaurante_id + categoria + disponible
    col.createIndex(
      { restaurante_id: 1, categoria: 1, disponible: 1 },
      { name: 'restaurante_categoria_disponible_esr' }
    ),
    // Multikey sobre etiquetas
    col.createIndex({ etiquetas: 1 }, { name: 'etiquetas_multikey' }),
    // Texto sobre nombre y descripcion
    col.createIndex({ nombre: 'text', descripcion: 'text' }, { name: 'nombre_descripcion_text' }),
    // Simple descendente sobre veces_ordenado
    col.createIndex({ veces_ordenado: -1 }, { name: 'veces_ordenado_desc' }),
  ])
  console.log('  [OK] menu_items indexes')
}

async function createOrderIndexes(db) {
  const col = db.collection('ordenes')
  await Promise.all([
    // Compuesto ESR: usuario_id + estado + fecha_creacion desc
    col.createIndex(
      { usuario_id: 1, estado: 1, fecha_creacion: -1 },
      { name: 'usuario_estado_fecha_esr' }
    ),
    // Compuesto ESR: restaurante_id + estado + fecha_creacion desc
    col.createIndex(
      { restaurante_id: 1, estado: 1, fecha_creacion: -1 },
      { name: 'restaurante_estado_fecha_esr' }
    ),
    // Simple sobre estado
    col.createIndex({ estado: 1 }, { name: 'estado_simple' }),
    // Multikey sobre items.item_id
    col.createIndex({ 'items.item_id': 1 }, { name: 'items_item_id_multikey' }),
    // Simple descendente sobre fecha_creacion
    col.createIndex({ fecha_creacion: -1 }, { name: 'fecha_creacion_desc' }),
  ])
  console.log('  [OK] ordenes indexes')
}

async function createReviewIndexes(db) {
  const col = db.collection('resenas')
  await Promise.all([
    // Compuesto: restaurante_id + calificacion desc
    col.createIndex({ restaurante_id: 1, calificacion: -1 }, { name: 'restaurante_calificacion' }),
    // Simple sobre cliente_id (FK al usuario que escribió la reseña)
    col.createIndex({ cliente_id: 1 }, { name: 'cliente_id_simple' }),
    // Simple descendente sobre fecha
    col.createIndex({ fecha: -1 }, { name: 'fecha_desc' }),
    // Multikey sobre tags
    col.createIndex({ tags: 1 }, { name: 'tags_multikey' }),
    // Texto sobre titulo y comentario
    col.createIndex({ titulo: 'text', comentario: 'text' }, { name: 'titulo_comentario_text' }),
    // Simple sobre orden_id
    col.createIndex({ orden_id: 1 }, { name: 'orden_id_simple' }),
  ])
  console.log('  [OK] resenas indexes')
}
