import { Decimal128 } from 'mongodb'

// ── Helpers ───────────────────────────────────────────────────

const dec = (n) => new Decimal128(n.toFixed(2))

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickWeighted(items, weights) {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const FLOW   = ['pendiente', 'en_proceso', 'en_camino', 'entregado']
const ESTADOS = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado']
const PESOS   = [0.05,        0.10,         0.10,        0.55,        0.20]

const NOTAS_ORDEN = [
  'Sin cebolla por favor',
  'Picante extra',
  'Un poco menos de sal',
  'Entregar en portería',
  'Sin salsa adicional',
  'Todo bien cocido',
  'Alergia a los cacahuates — omitir',
]

/**
 * Construye historial_estados coherente con el estado final.
 * actorId del cliente crea la orden; propietario avanza estados.
 */
function buildHistorial(estado, fechaBase, clientId, propietarioId) {
  const base     = fechaBase.getTime()
  const INTERVAL = 18 * 60 * 1000 // 18 min entre transiciones

  const targetIdx = estado === 'cancelado'
    ? Math.floor(Math.random() * 3)   // cancela en 0, 1 o 2 pasos
    : FLOW.indexOf(estado)

  const historial = []

  for (let i = 0; i <= targetIdx; i++) {
    historial.push({
      estado:    FLOW[i],
      timestamp: new Date(base + i * INTERVAL),
      actor_id:  i === 0 ? clientId : propietarioId,
    })
  }

  if (estado === 'cancelado') {
    historial.push({
      estado:    'cancelado',
      timestamp: new Date(base + (targetIdx + 1) * INTERVAL),
      actor_id:  clientId,
      nota:      'Orden cancelada por el cliente',
    })
  }

  return historial
}

/**
 * Genera batches de órdenes usando datos reales de la DB.
 *
 * @param {Array}  clientDocs          Usuarios con rol='cliente' desde DB (tienen _id y direcciones).
 * @param {Array}  restaurantMenuData  Array de { restaurante_id, propietario_id, items: [{_id, nombre, precio}] }.
 * @param {number} total               Número total de órdenes a generar (default 50 000).
 * @param {number} batchSize           Documentos por lote (default 2 000).
 * @yields {Array} Lote de documentos listos para insertMany.
 */
export function* generateOrderBatches(clientDocs, restaurantMenuData, total = 50_000, batchSize = 2_000) {
  const START = new Date('2023-01-01')
  const END   = new Date('2025-12-31')

  let generated = 0
  let batch = []

  while (generated < total) {
    const client  = pick(clientDocs)
    const restMeta = pick(restaurantMenuData)

    // Dirección de entrega: principal o primera disponible
    const addr = client.direcciones.find((d) => d.es_principal) ?? client.direcciones[0]
    const direccionEntrega = {
      alias:  addr.alias,
      calle:  addr.calle,
      ciudad: addr.ciudad,
      pais:   addr.pais,
    }

    // Elegir 1–3 ítems del menú del restaurante (sin repetir)
    const numItems = pickWeighted([1, 2, 3], [0.35, 0.45, 0.20])
    const chosen   = [...restMeta.items].sort(() => Math.random() - 0.5).slice(0, numItems)

    const orderItems = chosen.map((item) => {
      const cantidad = Math.ceil(Math.random() * 3)
      const entry = {
        item_id:         item._id,                         // ObjectId real de la DB
        nombre:          item.nombre,                      // snapshot del nombre
        precio_unitario: dec(item.precio),                 // snapshot del precio
        cantidad,
        subtotal:        dec(item.precio * cantidad),
      }
      if (Math.random() < 0.12) entry.notas_item = pick(NOTAS_ORDEN)
      return entry
    })

    const totalNum = orderItems.reduce((s, i) => s + parseFloat(i.precio_unitario.toString()) * i.cantidad, 0)
    const estado   = pickWeighted(ESTADOS, PESOS)
    const fechaCreacion = randomDate(START, END)

    const doc = {
      usuario_id:        client._id,                       // ObjectId real de la DB
      restaurante_id:    restMeta.restaurante_id,          // ObjectId real de la DB
      items:             orderItems,
      estado,
      historial_estados: buildHistorial(estado, fechaCreacion, client._id, restMeta.propietario_id),
      total:             dec(totalNum),
      direccion_entrega: direccionEntrega,
      fecha_creacion:    fechaCreacion,
      fecha_entrega_real: estado === 'entregado'
        ? new Date(fechaCreacion.getTime() + (35 + Math.random() * 40) * 60 * 1000)
        : null,
      tiene_resena: false,
    }

    if (Math.random() < 0.14) doc.notas = pick(NOTAS_ORDEN)

    batch.push(doc)
    generated++

    if (batch.length >= batchSize) {
      yield batch
      batch = []
    }
  }

  if (batch.length > 0) yield batch
}
