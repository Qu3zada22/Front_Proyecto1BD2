/**
 * Entry point principal — orquesta todo el proceso de ingest.
 *
 * Flujo:
 *   1. Índices (colecciones vacías → más eficiente)
 *   2. Insertar usuarios → query de vuelta para obtener IDs reales
 *   3. Insertar restaurantes (usa IDs de propietarios) → query de vuelta
 *   4. Insertar menu_items (usa IDs de restaurantes) → query de vuelta
 *   5. Generar e insertar 50 000 órdenes en batches (usa datos reales de menú)
 *   6. Actualizar veces_ordenado con bulkWrite
 *   7. Generar e insertar reseñas (usa IDs reales de órdenes entregadas)
 *   8. Marcar tiene_resena = true en órdenes reseñadas
 *   9. Recalcular calificacion_prom y total_resenas en restaurantes
 *  10. Subir imágenes placeholder a GridFS y actualizar referencias
 *
 * Uso: npm run ingest
 */
import { connect, disconnect } from "./db.js";
import { createAllIndexes } from "./operations/indexes.js";
import { uploadBuffer, transparentPNG } from "./operations/gridfs.js";
import { GridFSBucket } from "mongodb";
import { users } from "./data/01_users.js";
import { buildRestaurants } from "./data/02_restaurants.js";
import { buildMenuItems } from "./data/03_menu_items.js";
import { generateOrderBatches } from "./data/04_orders.js";
import { generateReviews } from "./data/05_reviews.js";

const TOTAL_ORDERS = 50_000;
const BATCH_SIZE = 2_000;
const COLLECTIONS = [
  "usuarios",
  "restaurantes",
  "menu_items",
  "ordenes",
  "resenas",
];

async function main() {
  console.log("=== INGEST START ===\n");
  const db = await connect();

  // ── 0. Limpiar colecciones ─────────────────────────────────
  console.log("Dropping existing collections...");
  for (const col of COLLECTIONS) {
    await db
      .collection(col)
      .drop()
      .catch(() => {});
    console.log(`  dropped: ${col}`);
  }
  // Limpiar GridFS (media.files + media.chunks)
  const bucket = new GridFSBucket(db, { bucketName: "media" });
  await bucket.drop().catch(() => {});
  console.log("  dropped: media (GridFS)");

  // ── 1. Índices (en colecciones vacías) ─────────────────────
  console.log("\nCreating indexes...");
  await createAllIndexes(db);

  // ── 2. Usuarios ────────────────────────────────────────────
  console.log("\nInserting users...");
  await db.collection("usuarios").insertMany(users);
  console.log(`  inserted: ${users.length} users`);

  // Query de vuelta para obtener IDs y nombres reales
  const ownersFromDB = await db
    .collection("usuarios")
    .find({ rol: "propietario" })
    .sort({ fecha_registro: 1 })
    .toArray();
  const ownersByName = new Map(ownersFromDB.map((o) => [o.nombre, o._id]));

  // ── 3. Restaurantes ────────────────────────────────────────
  console.log("\nInserting restaurants...");
  const restaurantDocs = buildRestaurants(ownersByName);
  await db.collection("restaurantes").insertMany(restaurantDocs);
  console.log(`  inserted: ${restaurantDocs.length} restaurants`);

  // Query de vuelta para obtener IDs y propietario_id reales
  const restsFromDB = await db.collection("restaurantes").find({}).toArray();
  const restaurantsByName = new Map(restsFromDB.map((r) => [r.nombre, r._id]));

  // ── 4. Menu items ──────────────────────────────────────────
  console.log("\nInserting menu items...");
  const menuDocs = buildMenuItems(restaurantsByName);
  await db.collection("menu_items").insertMany(menuDocs);
  console.log(`  inserted: ${menuDocs.length} menu items`);

  // Query de vuelta: datos reales de menú agrupados por restaurante
  const menuFromDB = await db.collection("menu_items").find({}).toArray();
  const clientsFromDB = await db
    .collection("usuarios")
    .find({ rol: "cliente" })
    .toArray();

  // Estructura que necesita el generador de órdenes
  const restaurantMenuData = restsFromDB.map((rest) => ({
    restaurante_id: rest._id,
    propietario_id: rest.propietario_id,
    items: menuFromDB
      .filter((m) => m.restaurante_id.equals(rest._id))
      .map((m) => ({
        _id: m._id,
        nombre: m.nombre,
        precio: parseFloat(m.precio.toString()),
      })),
  }));

  // ── 5. Órdenes (50 000 en batches) ────────────────────────
  console.log(`\nInserting ${TOTAL_ORDERS} orders (batch ${BATCH_SIZE})...`);
  const deliveredMeta = []; // {_id, restaurante_id, usuario_id, fecha_creacion}
  const vecesMap = new Map(); // itemId.toHexString() → cantidad total ordenada
  let totalOrders = 0;

  for (const batch of generateOrderBatches(
    clientsFromDB,
    restaurantMenuData,
    TOTAL_ORDERS,
    BATCH_SIZE,
  )) {
    const result = await db.collection("ordenes").insertMany(batch);

    batch.forEach((order, i) => {
      const insertedId = result.insertedIds[i];

      if (order.estado === "entregado") {
        deliveredMeta.push({
          _id: insertedId,
          restaurante_id: order.restaurante_id,
          usuario_id: order.usuario_id,
          fecha_creacion: order.fecha_creacion,
        });
      }

      for (const item of order.items) {
        const key = item.item_id.toHexString();
        vecesMap.set(key, (vecesMap.get(key) || 0) + item.cantidad);
      }
    });

    totalOrders += batch.length;
    process.stdout.write(`\r  progress: ${totalOrders}/${TOTAL_ORDERS}`);
  }
  console.log(
    `\n  inserted: ${totalOrders} orders  |  delivered: ${deliveredMeta.length}`,
  );

  // ── 6. Actualizar veces_ordenado ───────────────────────────
  console.log("\nUpdating veces_ordenado...");
  const { ObjectId } = await import("mongodb");
  const vecesOps = [...vecesMap.entries()].map(([hexId, count]) => ({
    updateOne: {
      filter: { _id: new ObjectId(hexId) },
      update: { $set: { veces_ordenado: count } },
    },
  }));
  await db.collection("menu_items").bulkWrite(vecesOps, { ordered: false });
  console.log(`  updated: ${vecesOps.length} items`);

  // ── 7. Reseñas ─────────────────────────────────────────────
  console.log("\nGenerating reviews...");
  const clientIds = clientsFromDB.map((c) => c._id);
  const reviews = generateReviews(deliveredMeta, clientIds);
  await db.collection("resenas").insertMany(reviews);
  console.log(`  inserted: ${reviews.length} reviews`);

  // ── 8. tiene_resena = true ─────────────────────────────────
  console.log("\nUpdating tiene_resena...");
  const reviewedIds = reviews.map((r) => r.orden_id);
  const { modifiedCount: marcadas } = await db
    .collection("ordenes")
    .updateMany(
      { _id: { $in: reviewedIds } },
      { $set: { tiene_resena: true } },
    );
  console.log(`  marked: ${marcadas} orders`);

  // ── 9. Recalcular ratings de restaurantes ─────────────────
  console.log("\nRecalculating restaurant ratings...");
  const ratings = await db
    .collection("resenas")
    .aggregate([
      { $match: { activa: true } },
      {
        $group: {
          _id: "$restaurante_id",
          prom: { $avg: "$calificacion" },
          total: { $sum: 1 },
        },
      },
    ])
    .toArray();

  await db.collection("restaurantes").bulkWrite(
    ratings.map((r) => ({
      updateOne: {
        filter: { _id: r._id },
        update: {
          $set: {
            calificacion_prom: Math.round(r.prom * 10) / 10,
            total_resenas: r.total,
          },
        },
      },
    })),
    { ordered: false },
  );
  console.log(`  updated: ${ratings.length} restaurants`);

  // ── 10. GridFS: imágenes placeholder ──────────────────────
  console.log("\nUploading images to GridFS...");
  const png = transparentPNG();

  // Portada de cada restaurante
  const coverOps = [];
  for (const rest of restsFromDB) {
    const fileId = await uploadBuffer(
      db,
      png,
      `portada_${rest._id.toHexString()}.png`,
      {
        type: "restaurant_cover",
        restaurante_id: rest._id,
      },
    );
    coverOps.push({
      updateOne: {
        filter: { _id: rest._id },
        update: { $set: { img_portada_id: fileId } },
      },
    });
  }
  await db.collection("restaurantes").bulkWrite(coverOps, { ordered: false });
  console.log(`  uploaded: ${coverOps.length} restaurant covers`);

  // Imagen de los 3 primeros items de cada restaurante
  const imageOps = [];
  for (const item of menuFromDB.filter((_, i) => i % 9 < 3)) {
    const fileId = await uploadBuffer(
      db,
      png,
      `item_${item._id.toHexString()}.png`,
      {
        type: "menu_item",
        item_id: item._id,
      },
    );
    imageOps.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { imagen_id: fileId } },
      },
    });
  }
  await db.collection("menu_items").bulkWrite(imageOps, { ordered: false });
  console.log(`  uploaded: ${imageOps.length} menu item images`);

  // ── Resumen ────────────────────────────────────────────────
  console.log("\n=== INGEST COMPLETE ===");
  console.log(`  usuarios:     ${users.length}`);
  console.log(`  restaurantes: ${restaurantDocs.length}`);
  console.log(`  menu_items:   ${menuDocs.length}`);
  console.log(`  ordenes:      ${totalOrders}`);
  console.log(`  resenas:      ${reviews.length}`);
  console.log(`  gridfs files: ${coverOps.length + imageOps.length}`);

  await disconnect();
}

main().catch((err) => {
  console.error("\nIngest failed:", err);
  process.exit(1);
});
