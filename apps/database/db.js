import { MongoClient } from 'mongodb'
import 'dotenv/config'

let client
let db

/** Extrae el nombre de la BD del path de la URI, e.g. ".../fastpochi?..." → "fastpochi" */
function dbNameFromUri(uri) {
  try {
    const name = new URL(uri).pathname.replace(/^\//, '').split('?')[0]
    if (name) return name
  } catch {}
  return null
}

export async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) throw new Error('MONGODB_URI (o MONGO_URI) no está definido en .env')
  client = new MongoClient(uri)
  await client.connect()
  const dbName = dbNameFromUri(uri) || process.env.DB_NAME || process.env.MONGO_DB || 'fastpochi'
  db = client.db(dbName)
  console.log(`Connected to MongoDB -> ${db.databaseName}`)
  return db
}

export function getDb() {
  if (!db) throw new Error('Call connect() first')
  return db
}

export function getClient() {
  if (!client) throw new Error('Call connect() first')
  return client
}

export async function disconnect() {
  if (client) {
    await client.close()
    console.log('Disconnected from MongoDB')
  }
}
