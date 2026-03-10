import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PreferenceTags } from "@/components/fastpochi/preference-tags";
import { RESTAURANT_CATEGORIES } from "@/lib/mock-data";
import type { HorarioDia } from "@/lib/mock-data";
import { useAuth, useData } from "@/lib/store";

const DIAS: { key: string; label: string }[] = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

const DEFAULT_HORARIO: Record<string, HorarioDia> = {
  lunes: { abre: "08:00", cierra: "22:00", cerrado: false },
  martes: { abre: "08:00", cierra: "22:00", cerrado: false },
  miercoles: { abre: "08:00", cierra: "22:00", cerrado: false },
  jueves: { abre: "08:00", cierra: "22:00", cerrado: false },
  viernes: { abre: "08:00", cierra: "23:00", cerrado: false },
  sabado: { abre: "09:00", cierra: "23:00", cerrado: false },
  domingo: { abre: "09:00", cierra: "20:00", cerrado: false },
};

export default function PropietarioNuevoRestaurante() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addRestaurante } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [calle, setCalle] = useState("");
  const [ciudad, setCiudad] = useState("Guatemala");
  const [pais, setPais] = useState("GT");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [telefono, setTelefono] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [horario, setHorario] =
    useState<Record<string, HorarioDia>>(DEFAULT_HORARIO);
  const [lat, setLat] = useState("14.6349");
  const [lng, setLng] = useState("-90.5069");
  // Mock GridFS: store preview URL (real backend would POST file → get ObjectId)
  const [imgPreview, setImgPreview] = useState<string>(
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simulate GridFS upload — real backend: POST /api/gridfs/upload → returns img_portada_id
    const previewUrl = URL.createObjectURL(file);
    setImgPreview(previewUrl);
  };

  const updateDia = (
    dia: string,
    field: keyof HorarioDia,
    value: string | boolean,
  ) => {
    setHorario((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || categorias.length === 0) return;
    addRestaurante({
      propietario_id: user._id,
      nombre,
      descripcion,
      ubicacion: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      direccion: { calle, ciudad, pais, codigo_postal: codigoPostal },
      categorias,
      horario,
      telefono,
      img_portada: imgPreview,
    });
    navigate("/propietario");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/propietario")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          Agregar Restaurante
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Imagen de portada (mock GridFS) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              Imagen de Portada
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative h-40 w-full overflow-hidden rounded-lg bg-muted">
              {imgPreview ? (
                <img
                  src={imgPreview}
                  alt="Portada"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon size={40} className="text-muted-foreground/40" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 self-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Subir imagen
            </Button>
            <p className="text-xs text-muted-foreground">
              En el backend este archivo se guardará en GridFS y se almacenará
              el ObjectId en img_portada_id.
            </p>
          </CardContent>
        </Card>

        {/* Información general */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre del restaurante</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Mi Restaurante"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Textarea
                id="desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe tu restaurante..."
                rows={3}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tel">Teléfono</Label>
              <Input
                id="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+502 1234 5678"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categorías</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona al menos una
              </p>
              <PreferenceTags
                tags={RESTAURANT_CATEGORIES}
                selected={categorias}
                onToggle={(t) =>
                  setCategorias((prev) =>
                    prev.includes(t)
                      ? prev.filter((c) => c !== t)
                      : [...prev, t],
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección y ubicación */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              Dirección y Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calle">Dirección</Label>
              <Input
                id="calle"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                placeholder="5a Avenida 11-59, Zona 1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="GT"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp">Código Postal</Label>
              <Input
                id="cp"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="01010"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lat">Latitud (GeoJSON)</Label>
                <Input
                  id="lat"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="14.6349"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lng">Longitud (GeoJSON)</Label>
                <Input
                  id="lng"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-90.5069"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horario */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Horario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {DIAS.map(({ key, label }) => {
                const dia = horario[key];
                return (
                  <div
                    key={key}
                    className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-3"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Abre
                      </Label>
                      <Input
                        type="time"
                        value={dia.abre}
                        disabled={dia.cerrado}
                        onChange={(e) => updateDia(key, "abre", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Cierra
                      </Label>
                      <Input
                        type="time"
                        value={dia.cierra}
                        disabled={dia.cerrado}
                        onChange={(e) =>
                          updateDia(key, "cierra", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 pt-4">
                      <Label className="text-[10px] text-muted-foreground">
                        Cerrado
                      </Label>
                      <Checkbox
                        checked={dia.cerrado}
                        onCheckedChange={(v) => updateDia(key, "cerrado", !!v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={categorias.length === 0}
        >
          Crear Restaurante
        </Button>
      </form>
    </div>
  );
}
