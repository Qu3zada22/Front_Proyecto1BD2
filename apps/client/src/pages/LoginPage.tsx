import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Logo } from "@/components/fastpochi/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/lib/store"
import { usuarios } from "@/lib/mock-data"

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = login(email, "")
    if (!ok) { setError(true); return }
    const user = usuarios.find((u) => u.email === email)
    if (user?.rol === "admin") navigate("/admin")
    else if (user?.rol === "propietario") navigate("/propietario")
    else navigate("/cliente")
  }

  // Quick login buttons for demo
  const demoUsers = [
    { label: "Cliente", email: usuarios.find((u) => u.rol === "cliente")?.email || "" },
    { label: "Propietario", email: usuarios.find((u) => u.rol === "propietario")?.email || "" },
    { label: "Admin", email: usuarios.find((u) => u.rol === "admin")?.email || "" },
  ]

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2 text-center">
            <h1 className="text-xl font-semibold text-foreground">Iniciar Sesion</h1>
            <p className="text-sm text-muted-foreground">Selecciona un usuario de demo</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {demoUsers.map((u) => (
              <Button
                key={u.label}
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  const ok = login(u.email, "")
                  if (ok) {
                    if (u.label === "Admin") navigate("/admin")
                    else if (u.label === "Propietario") navigate("/propietario")
                    else navigate("/cliente")
                  }
                }}
              >
                <span className="font-medium">{u.label}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </Button>
            ))}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">o ingresa tu email</span></div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(false) }}
                placeholder="correo@ejemplo.com"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {error && <p className="text-xs text-destructive">Usuario no encontrado</p>}
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}