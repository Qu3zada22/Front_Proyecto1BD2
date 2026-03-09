import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Logo } from "@/components/fastpochi/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/lib/store"
import { api } from "@/lib/api"

type DemoUser = { label: string; email: string; rol: string }

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])

  useEffect(() => {
    api.getUsers().then((users) => {
      const byRol = (rol: string) => users.find((u: any) => u.rol === rol)
      const admin = byRol("admin")
      const propietario = byRol("propietario")
      const cliente = byRol("cliente")
      setDemoUsers([
        ...(cliente ? [{ label: "Cliente", email: cliente.email, rol: "cliente" }] : []),
        ...(propietario ? [{ label: "Propietario", email: propietario.email, rol: "propietario" }] : []),
        ...(admin ? [{ label: "Admin", email: admin.email, rol: "admin" }] : []),
      ])
    }).catch(() => {})
  }, [])

  const doLogin = async (emailStr: string) => {
    setLoading(true)
    setError(false)
    try {
      const ok = await login(emailStr, "")
      if (!ok) { setError(true); return }
      // Get user role for redirect
      const users = await api.getUsers({ email: emailStr })
      const rol = users[0]?.rol ?? "cliente"
      if (rol === "admin") navigate("/admin")
      else if (rol === "propietario") navigate("/propietario")
      else navigate("/cliente")
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin(email)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2 text-center">
            <h1 className="text-xl font-semibold text-foreground">Iniciar Sesion</h1>
            <p className="text-sm text-muted-foreground">Ingresa tu correo para continuar</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {demoUsers.map((u) => (
              <Button
                key={u.label}
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={loading}
                onClick={() => doLogin(u.email)}
              >
                <span className="font-medium">{u.label}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </Button>
            ))}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-2">o ingresa tu email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(false) }}
                placeholder="correo@ejemplo.com"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={loading}
              />
              {error && <p className="text-xs text-destructive">Usuario no encontrado</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
