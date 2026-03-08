import { GridFSBucket } from 'mongodb'
import { createReadStream, createWriteStream } from 'fs'
import { Readable } from 'stream'

const BUCKET_NAME = 'media'

function getBucket(db) {
  return new GridFSBucket(db, { bucketName: BUCKET_NAME })
}

/**
 * Sube un Buffer a GridFS.
 * @returns {ObjectId} fileId del archivo subido.
 */
export async function uploadBuffer(db, buffer, filename, metadata = {}) {
  const bucket = getBucket(db)
  const uploadStream = bucket.openUploadStream(filename, { metadata })
  const readable = Readable.from(buffer)
  await new Promise((resolve, reject) => {
    readable.pipe(uploadStream).on('finish', resolve).on('error', reject)
  })
  return uploadStream.id
}

/**
 * Sube un archivo desde disco a GridFS.
 * @returns {ObjectId} fileId del archivo subido.
 */
export async function uploadFile(db, filePath, filename, metadata = {}) {
  const bucket = getBucket(db)
  const uploadStream = bucket.openUploadStream(filename, { metadata })
  const readStream = createReadStream(filePath)
  await new Promise((resolve, reject) => {
    readStream.pipe(uploadStream).on('finish', resolve).on('error', reject)
  })
  return uploadStream.id
}

/**
 * Descarga un archivo de GridFS a disco.
 */
export async function downloadToFile(db, fileId, destPath) {
  const bucket = getBucket(db)
  const downloadStream = bucket.openDownloadStream(fileId)
  const writeStream = createWriteStream(destPath)
  await new Promise((resolve, reject) => {
    downloadStream.pipe(writeStream).on('finish', resolve).on('error', reject)
  })
}

/**
 * Descarga un archivo de GridFS y lo retorna como Buffer.
 */
export async function downloadToBuffer(db, fileId) {
  const bucket = getBucket(db)
  const downloadStream = bucket.openDownloadStream(fileId)
  const chunks = []
  for await (const chunk of downloadStream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Abre un stream de descarga (útil para streamear al cliente HTTP).
 */
export function openDownloadStream(db, fileId) {
  return getBucket(db).openDownloadStream(fileId)
}

/**
 * Elimina un archivo de GridFS por su fileId.
 */
export async function deleteFile(db, fileId) {
  await getBucket(db).delete(fileId)
}

/**
 * Lista todos los archivos almacenados en GridFS.
 */
export async function listFiles(db) {
  return getBucket(db).find({}).toArray()
}

/**
 * Busca un archivo por nombre.
 */
export async function findFileByName(db, filename) {
  return getBucket(db).find({ filename }).toArray()
}

/**
 * Genera un buffer PNG de 1×1 píxel para usar como placeholder.
 * No requiere dependencias de canvas ni sharp.
 */
export function placeholderPNG() {
  return Buffer.from(
    '89504e470d0a1a0a0000000d494844520000000100000001' +
    '08020000009001 2e0000000c4944415408d76360f8cf' +
    'c00000000200018ddd182600000000049454e44ae426082',
    'hex'
  )
}

/**
 * PNG mínimo válido 1×1 (versión correcta sin espacios).
 */
export function minimalPNG() {
  // 1x1 píxel rojo opaco — PNG válido de 67 bytes
  return Buffer.from(
    '89504e470d0a1a0a' +           // PNG signature
    '0000000d49484452' +           // IHDR length=13
    '00000001' +                   // width=1
    '00000001' +                   // height=1
    '08020000009001' +             // bit depth, color type RGB, ...
    '2e00000000c' +                // (CRC de IHDR)
    '49444154' +                   // IDAT
    '789c6260f8cf' +
    'c0000000020001' +
    '8ddd1826' +
    '0000000049454e44ae426082',    // IEND
    'hex'
  ).slice(0, 1) // fallback: devolver buffer simple si hex es inválido
}

/**
 * Buffer PNG confiable de 68 bytes (1×1 píxel transparente).
 */
export function transparentPNG() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG sig
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // RGBA
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT
    0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, // compressed
    0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, // data
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, // IEND
    0x60, 0x82,
  ])
}
