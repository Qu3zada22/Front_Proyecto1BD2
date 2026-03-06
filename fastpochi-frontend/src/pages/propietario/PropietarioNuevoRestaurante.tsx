import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PreferenceTags } from "@/components/fastpochi/preference-tags"
import { RESTAURANT_CATEGORIES } from "@/lib/mock-data"
import { useAuth, useData } from "@/lib/store"

export default function PropietarioNuevoRestaurante() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addRestaurante } = useData()

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [calle, setCalle] = useState("")
  const [ciudad, setCiudad] = useState("Guatemala")
  const [codigoPostal, setCodigoPostal] = useState("")
  const [telefono, setTelefono] = useState("")
  const [categorias, setCategorias] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || categorias.length === 0) return
    addRestaurante({
      propietario_id: user._id,
      nombre,
      descripcion,
      ubicacion: { type: "Point", coordinates: [-90.5069, 14.6349] },
      direccion: { calle, ciudad, pais: "GT", codigo_postal: codigoPostal },
      categorias,
      horario: {
        lunes: { abre: "08:00", cierra: "22:00", cerrado: false },
        martes: { abre: "08:00", cierra: "22:00", cerrado: false },
        miercoles: { abre: "08:00", cierra: "22:00", cerrado: false },
        jueves: { abre: "08:00", cierra: "22:00", cerrado: false },
        viernes: { abre: "08:00", cierra: "23:00", cerrado: false },
        sabado: { abre: "09:00", cierra: "23:00", cerrado: false },
        domingo: { abre: "09:00", cierra: "20:00", cerrado: false },
      },
      telefono,
      img_portada: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
    })
    navigate("/propietario")
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/propietario")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Agregar Restaurante</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Informacion del Restaurante</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre del restaurante</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Mi Restaurante" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="desc">Descripcion</Label>
              <Textarea id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describe tu restaurante..." rows={3} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="calle">Direccion</Label>
                <Input id="calle" value={calle} onChange={(e) => setCalle(e.target.value)} placeholder="5a Avenida 11-59" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cp">Codigo Postal</Label>
                <Input id="cp" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} placeholder="01010" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tel">Telefono</Label>
                <Input id="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+502 1234 5678" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categorias</Label>
              <p className="text-xs text-muted-foreground">Selecciona al menos una categoria</p>
              <PreferenceTags
                tags={RESTAURANT_CATEGORIES}
                selected={categorias}
                onToggle={(t) => setCategorias((prev) => prev.includes(t) ? prev.filter((c) => c !== t) : [...prev, t])}
              />
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={categorias.length === 0}>
              Crear Restaurante
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}