'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Palette, User, Eye, EyeOff,
  AlertCircle, CheckCircle2, Upload, X, ArrowRight, ArrowLeft,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'
import { cn } from '@/lib/utils'

type Step = 1 | 2

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function RegistroForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step
  const [step, setStep] = useState<Step>(1)

  // Step 1 — Business
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Step 2 — Credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<{ username: string } | null>(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNombreChange = (v: string) => {
    setNombre(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugManual(true)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('El logo no puede superar 2 MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validateStep1 = () => {
    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return false
    }
    if (!slug || !/^[a-z0-9-]{3,40}$/.test(slug)) {
      setError('El identificador debe tener 3-40 caracteres: letras minúsculas, números y guiones')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (validateStep1()) setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const fd = new FormData()
      fd.append('nombre', nombre.trim())
      fd.append('slug', slug)
      fd.append('primaryColor', primaryColor)
      fd.append('email', email.trim().toLowerCase())
      fd.append('password', password)
      if (logoFile) fd.append('logo', logoFile)

      const res = await fetch('/api/registro', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al registrarse')
        return
      }

      setSuccess({ username: json.admin.username })
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-black">¡Todo listo!</h2>
          <p className="text-sm text-muted-foreground mt-2">Tu negocio fue registrado correctamente.</p>
        </div>
        <div className="bg-muted border border-border rounded-xl p-4 text-left space-y-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Tus credenciales de acceso</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Usuario</span>
            <span className="text-sm font-bold text-black font-mono">{success.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Contraseña</span>
            <span className="text-sm text-black">la que elegiste</span>
          </div>
        </div>
        <Button
          className="w-full h-11 bg-black hover:bg-black/90 text-white font-semibold rounded"
          onClick={() => router.push('/')}
        >
          Ir al login
        </Button>
      </div>
    )
  }

  // ── Step indicators ───────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Tu negocio', icon: <Building2 className="h-4 w-4" /> },
    { n: 2, label: 'Tu cuenta', icon: <User className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Step bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              step === s.n
                ? 'bg-black text-white'
                : step > s.n
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground'
            )}>
              {step > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-px', step > s.n ? 'bg-green-300' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Negocio ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
              Datos de tu negocio
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Así va a aparecer en tu plataforma</p>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide">
              Nombre del negocio
            </label>
            <Input
              type="text"
              placeholder="Ej: La Trattoria"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="h-11 border-border focus:border-black focus:ring-black rounded"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide">
              Identificador único
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                waitless.app/
              </span>
              <Input
                type="text"
                placeholder="la-trattoria"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="h-11 pl-[92px] border-border focus:border-black focus:ring-black rounded font-mono text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Color principal de tu marca
            </label>
            <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
                  style={{ accentColor: primaryColor }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-black">{primaryColor.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">Se aplica en botones, header y acentos</p>
              </div>
              {/* Preview pill */}
              <div className="ml-auto flex gap-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                  Vista previa
                </span>
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide">
              Logo <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            {logoPreview ? (
              <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded-lg border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black truncate">{logoFile?.name}</p>
                  <p className="text-xs text-muted-foreground">{((logoFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={removeLogo} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl hover:border-black hover:bg-muted transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Subir logo</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, WEBP · máx. 2 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-red-50 border border-red-200 p-3 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={handleNext}
            className="w-full h-11 text-white font-semibold rounded"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="flex items-center gap-2">
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      )}

      {/* ── STEP 2: Cuenta admin ─────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
              Crear cuenta de administrador
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Con esto vas a entrar a tu plataforma</p>
          </div>

          {/* Google option — saves business data in sessionStorage for post-OAuth */}
          <GoogleAuthButton label="Registrarme con Google" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o con email y contraseña</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Resumen del negocio */}
          <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-xl">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: primaryColor }}>
                {nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black truncate">{nombre}</p>
              <p className="text-xs text-muted-foreground font-mono">/{slug}</p>
            </div>
            <div className="ml-auto w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide">
              Email
            </label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-border focus:border-black focus:ring-black rounded"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10 border-border focus:border-black focus:ring-black rounded"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-red-50 border border-red-200 p-3 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              onClick={() => { setStep(1); setError('') }}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 text-white font-semibold rounded"
              style={{ backgroundColor: primaryColor }}
              disabled={isLoading || !email.trim() || !password}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Registrando...
                </span>
              ) : (
                'Crear mi plataforma'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
