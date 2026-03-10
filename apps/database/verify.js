/**
 * Verifica la DB después del ingest.
 *
 * Demuestra los requisitos de la asignación:
 *   - explain() por cada tipo de índice (simple, único, compuesto, multikey, 2dsphere, texto)
 *   - Agregaciones simples: count y distinct
 *   - Pipelines complejos multi-etapa
 *   - Operadores de arrays: $push, $pull, $addToSet
 *   - Documentos embebidos
 *
 * Uso: npm run verify
 */
import { connect, disconnect } from "./db.js";
import { listFiles } from "./operations/gridfs.js";
import * as P from "./operations/pipelines.js";

const SEP = "\n" + "─".repeat(60);
const section = (title) => console.log(`${SEP}\n${title}`);

async function main() {
  const db = await connect();

  // Obtenemos un restaurante y usuario reales para las queries
  const sampleRest = await db
    .collection("restaurantes")
    .findOne({ nombre: "El Portal Chapín" });
  const sampleUser = await db
    .collection("usuarios")
    .findOne({ email: "ana.garcia@email.com" });

  // ══════════════════════════════════════════════════════════
  //  SECCIÓN 1 — AGREGACIONES SIMPLES
  // ══════════════════════════════════════════════════════════

  section("COUNT: documentos por colección");
  for (const col of [
    "usuarios",
    "restaurantes",
    "menu_items",
    "ordenes",
    "resenas",
  ]) {
    const n = await P.count(db, col);
    console.log(`  ${col.padEnd(15)} → ${n.toLocaleString()}`);
  }

  section("COUNT: órdenes por estado");
  for (const estado of [
    "pendiente",
    "en_proceso",
    "en_camino",
    "entregado",
    "cancelado",
  ]) {
    const n = await P.count(db, "ordenes", { estado });
    console.log(`  ${estado.padEnd(12)} → ${n.toLocaleString()}`);
  }

  section("DISTINCT: ciudades con restaurantes");
  console.log(" ", await P.distinct(db, "restaurantes", "direccion.ciudad"));

  section("DISTINCT: etiquetas en menu_items disponibles");
  console.log(
    " ",
    await P.distinct(db, "menu_items", "etiquetas", { disponible: true }),
  );

  section("DISTINCT: roles de usuarios");
  console.log(" ", await P.distinct(db, "usuarios", "rol"));

  // ══════════════════════════════════════════════════════════
  //  SECCIÓN 2 — EXPLAIN() POR TIPO DE ÍNDICE
  // ══════════════════════════════════════════════════════════

  section("EXPLAIN — índice único simple (email)");
  {
    const r = await db
      .collection("usuarios")
      .find({ email: "ana.garcia@email.com" })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  stage:             ${r.queryPlanner.winningPlan.stage}`);
    console.log(`  totalDocsExamined: ${s.totalDocsExamined}  (debe ser 1)`);
    console.log(`  totalKeysExamined: ${s.totalKeysExamined}`);
  }

  section("EXPLAIN — índice simple sobre rol");
  {
    const r = await db
      .collection("usuarios")
      .find({ rol: "cliente" })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  stage:             ${r.queryPlanner.winningPlan.stage}`);
    console.log(`  nReturned:         ${s.nReturned}`);
    console.log(`  totalDocsExamined: ${s.totalDocsExamined}`);
  }

  section("EXPLAIN — índice 2dsphere ($near geoespacial)");
  {
    const r = await db
      .collection("restaurantes")
      .find({
        ubicacion: {
          $near: {
            $geometry: { type: "Point", coordinates: [-90.5064, 14.6048] },
            $maxDistance: 5000,
          },
        },
      })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  stage:             ${r.queryPlanner.winningPlan.stage}`);
    console.log(`  nReturned:         ${s.nReturned}`);
  }

  section(
    "EXPLAIN — índice compuesto ESR (restaurante_id + estado + fecha_creacion)",
  );
  {
    const r = await db
      .collection("ordenes")
      .find({ restaurante_id: sampleRest._id, estado: "entregado" })
      .sort({ fecha_creacion: -1 })
      .limit(20)
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  totalDocsExamined: ${s.totalDocsExamined}`);
    console.log(`  totalKeysExamined: ${s.totalKeysExamined}`);
    console.log(`  nReturned:         ${s.nReturned}`);
  }

  section("EXPLAIN — índice texto (nombre + descripcion en restaurantes)");
  {
    const r = await db
      .collection("restaurantes")
      .find({ $text: { $search: "vegano italiana tradicional" } })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  nReturned:         ${s.nReturned}`);
    console.log(`  totalDocsExamined: ${s.totalDocsExamined}`);
  }

  section("EXPLAIN — índice multikey (tags en resenas)");
  {
    const r = await db
      .collection("resenas")
      .find({ tags: { $in: ["sabroso", "rapido"] }, activa: true })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  nReturned:         ${s.nReturned}`);
    console.log(`  totalKeysExamined: ${s.totalKeysExamined}`);
  }

  section("EXPLAIN — índice multikey (items.item_id en ordenes)");
  {
    const sampleItem = await db.collection("menu_items").findOne({});
    const r = await db
      .collection("ordenes")
      .find({ "items.item_id": sampleItem._id })
      .explain("executionStats");
    const s = r.executionStats;
    console.log(`  nReturned:         ${s.nReturned}`);
    console.log(`  totalKeysExamined: ${s.totalKeysExamined}`);
  }

  // ══════════════════════════════════════════════════════════
  //  SECCIÓN 3 — PIPELINES COMPLEJOS
  // ══════════════════════════════════════════════════════════

  section("PIPELINE P1 — Revenue por restaurante (entregadas)");
  for (const r of await P.revenueByRestaurant(db)) {
    const rev = parseFloat(r.total_revenue.toString());
    const tick = parseFloat(r.ticket_prom.toString());
    console.log(
      `  ${r.restaurante.padEnd(28)} Q${String(rev.toFixed(2)).padStart(10)}  ticket_prom: Q${tick.toFixed(2)}  (${r.num_ordenes} órdenes)`,
    );
  }

  section("PIPELINE P2 — Top 10 menu items más ordenados");
  for (const [i, r] of (await P.topMenuItems(db, 10)).entries()) {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.item.padEnd(30)} ×${r.veces_ordenado}  Q${r.precio}  — ${r.restaurante}`,
    );
  }

  section("PIPELINE P3 — Restaurantes con rating real (desde reseñas)");
  for (const r of await P.restaurantesConRating(db)) {
    console.log(
      `  ${r.nombre.padEnd(28)} ★ ${String(r.rating_real).padStart(3)}  (${r.resenas_activas} reseñas activas)`,
    );
  }

  section("PIPELINE P4 — Distribución de calificaciones por restaurante");
  for (const r of await P.distribucionCalificaciones(db)) {
    const breakdown = r.breakdown
      .sort((a, b) => a.calificacion - b.calificacion)
      .map((b) => `${b.calificacion}★:${b.cantidad}`)
      .join("  ");
    console.log(`  ${r.restaurante.padEnd(28)} ${breakdown}`);
  }

  section("PIPELINE P5 — Top 5 clientes más activos");
  for (const r of await P.clientesMasActivos(db, 5)) {
    const gastado = parseFloat(r.total_gastado.toString());
    console.log(
      `  ${r.cliente.padEnd(28)} ${r.total_ordenes} órdenes  Q${gastado.toFixed(2)} gastado`,
    );
  }

  section("PIPELINE P6 — Top 5 reseñas con más likes");
  for (const r of await P.topResenasPorLikes(db, 5)) {
    console.log(
      `  "${r.titulo}"  ★${r.calificacion}  👍${r.num_likes}  — ${r.autor} en ${r.restaurante}`,
    );
  }

  section("PIPELINE P7 — Estados de órdenes por restaurante");
  for (const r of await P.estadosOrdenesporRestaurante(db)) {
    const resumen = r.estados.map((e) => `${e.estado}:${e.total}`).join("  ");
    console.log(
      `  ${(r.restaurante ?? "(sin restaurante)").padEnd(28)} total:${r.total_ordenes}  [${resumen}]`,
    );
  }

  section("PIPELINE P8 — Items veganos disponibles por restaurante");
  for (const r of await P.itemsVeganosPorRestaurante(db)) {
    console.log(
      `  ${(r.restaurante ?? "(sin restaurante)").padEnd(28)} ${r.total_items_veganos} items veganos`,
    );
    r.items.forEach((i) =>
      console.log(`      • ${i.nombre} (${i.categoria}) Q${i.precio}`),
    );
  }

  section("Restaurantes cercanos a Zona Viva (≤ 3 km)");
  for (const r of await P.restaurantesCercanos(db, -90.5064, 14.6048, 3000)) {
    console.log(`  - ${r.nombre}  (${r.direccion.ciudad})`);
  }

  // ══════════════════════════════════════════════════════════
  //  SECCIÓN 4 — OPERADORES DE ARRAYS Y DOCUMENTOS EMBEBIDOS
  // ══════════════════════════════════════════════════════════

  section("$push — agregar dirección embebida a usuario");
  {
    const res = await P.pushDireccion(db, sampleUser._id, {
      alias: "Gym",
      calle: "6a Calle 4-10 Zona 10",
      ciudad: "Guatemala City",
      pais: "Guatemala",
      es_principal: false,
    });
    console.log(`  modifiedCount: ${res.modifiedCount}`);
    const u = await db
      .collection("usuarios")
      .findOne(
        { _id: sampleUser._id },
        { projection: { "direcciones.alias": 1 } },
      );
    console.log(
      `  direcciones ahora: ${u.direcciones.map((d) => d.alias).join(", ")}`,
    );
  }

  section("$pull — eliminar dirección 'Gym' del array embebido");
  {
    const res = await P.pullDireccion(db, sampleUser._id, "Gym");
    console.log(`  modifiedCount: ${res.modifiedCount}`);
  }

  section("$addToSet — agregar preferencia sin duplicar");
  {
    const userCarlos = await db
      .collection("usuarios")
      .findOne({ email: "carlos.lopez@email.com" });
    await P.addSetPreferencia(db, userCarlos._id, "saludable");
    await P.addSetPreferencia(db, userCarlos._id, "saludable"); // segunda vez: sin efecto
    const u = await db
      .collection("usuarios")
      .findOne({ _id: userCarlos._id }, { projection: { preferencias: 1 } });
    console.log(
      `  preferencias: ${JSON.stringify(u.preferencias)}  (saludable aparece 1 sola vez)`,
    );
  }

  section("$addToSet + $pull — likes en reseña");
  {
    const resena = await db.collection("resenas").findOne({ activa: true });
    if (resena) {
      await P.addSetLike(db, resena._id, sampleUser._id);
      await P.addSetLike(db, resena._id, sampleUser._id); // duplicado ignorado
      const after = await db
        .collection("resenas")
        .findOne({ _id: resena._id }, { projection: { likes: 1 } });
      console.log(`  likes después de 2 addToSet: ${after.likes.length}`);
      await P.pullLike(db, resena._id, sampleUser._id);
      const final = await db
        .collection("resenas")
        .findOne({ _id: resena._id }, { projection: { likes: 1 } });
      console.log(`  likes después de pull:       ${final.likes.length}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  SECCIÓN 5 — GRIDFS
  // ══════════════════════════════════════════════════════════

  section("GridFS — archivos almacenados");
  const files = await listFiles(db);
  console.log(`  total: ${files.length} archivos`);
  files
    .slice(0, 5)
    .forEach((f) => console.log(`  - ${f.filename}  (${f.length} bytes)`));
  if (files.length > 5) console.log(`  ... y ${files.length - 5} más`);

  console.log(`${SEP}\n=== VERIFY COMPLETE ===\n`);
  await disconnect();
}

main().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
