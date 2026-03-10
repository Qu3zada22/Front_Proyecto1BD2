import { ObjectId } from "mongodb";

// ── Contenido de reseñas ──────────────────────────────────────

const TITULOS_POS = [
  "Excelente experiencia",
  "Comida deliciosa, lo recomiendo",
  "Volveré a pedir sin duda",
  "Servicio rápido y sabroso",
  "Sabor auténtico e inigualable",
  "Superó mis expectativas",
  "La mejor opción de la zona",
  "Porciones generosas y ricas",
];

const TITULOS_NEU = [
  "Experiencia regular",
  "Está bien, pero puede mejorar",
  "Cumple, sin destacar",
  "Servicio aceptable",
];

const TITULOS_NEG = [
  "Demoró más de lo esperado",
  "Decepcionante para el precio",
  "No fue lo que esperaba",
  "Comida llegó fría",
];

const COMENTARIOS_POS = [
  "La comida llegó caliente y bien empacada. El sabor es excelente y las porciones son muy generosas. Definitivamente volvería a ordenar.",
  "Rapidísimo el servicio y todo llegó en perfectas condiciones. El sabor es auténtico, se nota que usan ingredientes frescos de calidad.",
  "Increíble experiencia, la presentación del pedido fue impecable y el sabor superó mis expectativas. Totalmente recomendado.",
  "Primera vez que pido aquí y quedé muy satisfecho. La relación calidad-precio es excelente. Ya lo compartí con mis amigos.",
  "El tiempo de entrega fue menor al estimado y la comida estaba perfecta. Los ingredientes son frescos y el sazón es buenísimo.",
  "Comida deliciosa con sabores muy bien balanceados. El empaque mantiene todo caliente y fresco. Mi nuevo favorito.",
  "Pedido completo, bien caliente y con la presentación exacta. El equipo de entrega fue muy amable. Cinco estrellas merecidas.",
];

const COMENTARIOS_NEU = [
  "La comida estaba bien aunque tardó un poco más de lo indicado. El sabor es correcto pero hay espacio para mejorar la consistencia.",
  "Pedido correcto y completo. El sabor es bueno pero no excepcional. Para el precio está bien, aunque esperaba un poco más.",
  "Servicio aceptable. La comida llegó a tiempo pero la temperatura no era la ideal. Consideraré volver a pedir para dar otra oportunidad.",
  "Ni muy bien ni muy mal. El sabor es estándar para este tipo de comida. Quizás vuelva si hay una promoción disponible.",
];

const COMENTARIOS_NEG = [
  "La entrega tardó casi el doble de lo estimado y la comida llegó fría. Esperaba mejor para el precio que se cobra.",
  "El sabor estaba bien pero faltó un ítem en mi pedido. El proceso de reclamo es lento. Perdí la confianza en este restaurante.",
  "Las porciones son muy pequeñas para el precio. La presentación dejó bastante que desear. No creo que vuelva a pedir aquí.",
  "Experiencia decepcionante. La comida no correspondió a las fotos del menú y el tiempo de entrega fue excesivo.",
];

const TAGS_POS = ["rapido", "sabroso", "limpio", "atencion"];
const TAGS_NEU = ["precio", "atencion"];
const TAGS_NEG = ["precio"];
const ALL_TAGS = [
  "rapido",
  "sabroso",
  "limpio",
  "ambiente",
  "precio",
  "atencion",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTags(calificacion) {
  const pool =
    calificacion >= 4 ? TAGS_POS : calificacion === 3 ? TAGS_NEU : TAGS_NEG;
  const n = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function pickCalificacion() {
  // Distribución realista sesgada hacia ratings altos
  const r = Math.random();
  if (r < 0.03) return 1;
  if (r < 0.1) return 2;
  if (r < 0.25) return 3;
  if (r < 0.55) return 4;
  return 5;
}

/**
 * Genera reseñas para ~25% de las órdenes entregadas.
 * @param {Array<{_id, restaurante_id, usuario_id, fecha_creacion}>} deliveredOrders
 * @param {ObjectId[]} clientIds - IDs reales de clientes desde la DB (para simular likes)
 * @returns {Array} Documentos de reseñas listos para insertMany.
 */
export function generateReviews(deliveredOrders, clientIds = []) {
  const reviews = [];

  for (const order of deliveredOrders) {
    if (Math.random() > 0.25) continue; // solo ~25% reciben reseña

    const calificacion = pickCalificacion();
    const titulo =
      calificacion >= 4
        ? pick(TITULOS_POS)
        : calificacion === 3
          ? pick(TITULOS_NEU)
          : pick(TITULOS_NEG);

    const comentario =
      calificacion >= 4
        ? pick(COMENTARIOS_POS)
        : calificacion === 3
          ? pick(COMENTARIOS_NEU)
          : pick(COMENTARIOS_NEG);

    // Algunos otros clientes han dado like a la reseña
    const numLikes =
      calificacion >= 4
        ? Math.floor(Math.random() * 8)
        : Math.floor(Math.random() * 3);
    const shuffledClients = [...clientIds].sort(() => Math.random() - 0.5);
    const likes = shuffledClients.slice(0, numLikes);

    // La reseña se publica algunos minutos después de la entrega
    const fechaResena = new Date(
      order.fecha_creacion.getTime() + (60 + Math.random() * 1440) * 60 * 1000,
    );

    reviews.push({
      _id: new ObjectId(),
      usuario_id: order.usuario_id,
      restaurante_id: order.restaurante_id,
      orden_id: order._id,
      calificacion,
      titulo,
      comentario,
      tags: pickTags(calificacion),
      likes,
      activa: true,
      fecha: fechaResena,
    });
  }

  return reviews;
}
