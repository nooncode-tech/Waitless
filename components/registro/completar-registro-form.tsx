'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Palette, AlertCircle, CheckCircle2, Upload, X, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * Shown after Google OAuth for new users who don't have a tenant yet.
 * Reads ?nombre=...&email=... from the URL (set by /auth/callback).
 * Calls /api/registro/completar (server-side) to create tenant + profile.
 */
export function CompletarRegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nombreParam = searchParams.get('nombre') ?? ''

  const [nombre, setNombre] = useState(nombreParam)
  const [slug, setSlug] = useState(slugify(nombreParam))
  const [slugManual, setSlugManual] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Verify the user is authenticated via Google before showing the form
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/registro')
      } else {
        setUserId(data.user.id)
      }
    })
  }, [router])

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
    if (file.size > 2 * 1024 * 1024) { setError('El logo no puede superar 2 MB'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres'); return
    }
    if (!slug || !/^[a-z0-9-]{3,40}$/.test(slug)) {
      setError('El identificador debe tener 3-40 caracteres: minúsculas, números y guiones'); return
    }
    if (!userId) {
      setError('Sesión no encontrada. Volvé a iniciar con Google.'); return
    }

    setIsLoading(true)
    try {
      const fd = new FormData()
      fd.append('nombre', nombre.trim())
      fd.append('slug', slug)
      fd.append('primaryColor', primaryColor)
      fd.append('userId', userId)
      if (logoFile) fd.append('logo', logoFile)

      const res = await fetch('/api/registro/completar', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? 'Error al guardar'); return }

      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-black">¡Tu plataforma está lista!</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Redirigiendo al panel...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#BEBEBE]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
          Configurá tu negocio
        </h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Ya casi estás. Completá los datos de tu restaurante.</p>
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
          className="h-11 border-[#E5E5E5] focus:border-black focus:ring-black rounded"
          required
          disabled={isLoading}
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-black uppercase tracking-wide">
          Identificador único
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#BEBEBE] select-none">
            waitless.app/
          </span>
          <Input
            type="text"
            placeholder="la-trattoria"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="h-11 pl-[92px] border-[#E5E5E5] focus:border-black focus:ring-black rounded font-mono text-sm"
            disabled={isLoading}
          />
        </div>
        <p className="text-[10px] text-[#BEBEBE]">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-black uppercase tracking-wide flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" />
          Color principal
        </label>
        <div className="flex items-center gap-3 p-3 border border-[#E5E5E5] rounded-xl">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
          />
          <div>
            <p className="text-sm font-semibold text-black">{primaryColor.toUpperCase()}</p>
            <p className="text-xs text-[#6B6B6B]">Botones, header y acentos</p>
          </div>
          <div className="ml-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
              Preview
            </span>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-black uppercase tracking-wide">
          Logo <span className="text-[#BEBEBE] font-normal">(opcional)</span>
        </label>
        {logoPreview ? (
          <div className="flex items-center gap-3 p-3 border border-[#E5E5E5] rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded-lg border border-[#E5E5E5]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate">{logoFile?.name}</p>
              <p className="text-xs text-[#6B6B6B]">{((logoFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={removeLogo} className="p-1.5 rounded-lg hover:bg-[#F2F2F2] transition-colors">
              <X className="h-4 w-4 text-[#BEBEBE]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-black hover:bg-[#F9F9F9] transition-colors"
          >
            <Upload className="h-6 w-6 text-[#BEBEBE]" />
            <span className="text-sm text-[#6B6B6B]">Subir logo</span>
            <span className="text-xs text-[#BEBEBE]">PNG, JPG, WEBP · máx. 2 MB</span>
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
        type="submit"
        className="w-full h-11 text-white font-semibold rounded"
        style={{ backgroundColor: primaryColor }}
        disabled={isLoading || !nombre.trim() || !slug}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creando tu plataforma...
          </span>
        ) : 'Crear mi plataforma'}
      </Button>
    </form>
  )
}
