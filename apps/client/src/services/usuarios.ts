const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

export interface UsuarioAPI {
  _id: string
  nombre: string
  email: string
  telefono?: string
  rol: "cliente" | "propietario" | "admin"
  activo: boolean
  preferencias: string[]
  direcciones: {
    alias: string
    calle: string
    ciudad: string
    pais: string
    es_principal: boolean
    coords?: { type: "Point"; coordinates: [number, number] }
  }[]
  createdAt: string
  updatedAt: string
}

export async function loginByEmail(email: string): Promise<UsuarioAPI> {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? "Usuario no encontrado")
  }

  return res.json()
}
