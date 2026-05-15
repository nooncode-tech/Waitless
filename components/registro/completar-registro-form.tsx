'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  border: '1px solid #E5E5E5',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  color: '#000',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(0,0,0,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 6,
  fontFamily: MONO,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
      <div style={{ textAlign: 'center', fontFamily: FONT }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(16,185,129,0.1)',
          border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
          ¡Tu plataforma está lista!
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>Redirigiendo al panel...</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{
          width: 24, height: 24, border: '2px solid #E5E5E5', borderTopColor: '#000',
          borderRadius: '50%', display: 'inline-block',
          animation: 'creg-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes creg-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
          Configurá tu negocio
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>
          Ya casi estás. Completá los datos de tu restaurante.
        </p>
      </div>

      {/* Nombre */}
      <div>
        <label style={labelStyle}>Nombre del negocio</label>
        <input
          type="text"
          placeholder="Ej: La Trattoria"
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          style={inputStyle}
          required
          disabled={isLoading}
        />
      </div>

      {/* Slug */}
      <div>
        <label style={labelStyle}>Identificador único</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: 'rgba(0,0,0,0.4)', pointerEvents: 'none',
            fontFamily: MONO, userSelect: 'none',
          }}>
            waitless.app/
          </span>
          <input
            type="text"
            placeholder="la-trattoria"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 98, fontFamily: MONO }}
            disabled={isLoading}
          />
        </div>
        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 5, fontFamily: MONO }}>
          Solo minúsculas, números y guiones. No se puede cambiar después.
        </p>
      </div>

      {/* Color */}
      <div>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>◎</span> Color principal
        </label>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 12, border: '1px solid #E5E5E5', borderRadius: 10,
        }}>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{ width: 40, height: 40, borderRadius: 8, cursor: 'pointer', border: 'none', padding: 2, background: 'transparent' }}
          />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#000', fontFamily: MONO }}>{primaryColor.toUpperCase()}</p>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Botones, header y acentos</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, color: '#fff',
              backgroundColor: primaryColor,
            }}>
              Preview
            </span>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label style={labelStyle}>
          Logo <span style={{ textTransform: 'none', fontWeight: 400, color: 'rgba(0,0,0,0.35)' }}>(opcional)</span>
        </label>
        {logoPreview ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, border: '1px solid #E5E5E5', borderRadius: 10,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="Logo preview" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #E5E5E5' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoFile?.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{((logoFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={removeLogo}
              style={{
                padding: 6, borderRadius: 8, border: 'none',
                background: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,0.4)',
              }}
            >✕</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '24px 16px', border: '2px dashed #E5E5E5', borderRadius: 10,
              background: 'none', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: 24, color: 'rgba(0,0,0,0.3)' }}>↑</span>
            <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontFamily: FONT }}>Subir logo</span>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', fontFamily: FONT }}>PNG, JPG, WEBP · máx. 2 MB</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleLogoChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#DC2626', fontSize: 12, fontFamily: FONT,
          background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !nombre.trim() || !slug}
        style={{
          width: '100%', height: 44,
          background: isLoading || !nombre.trim() || !slug ? '#E5E5E5' : primaryColor,
          color: isLoading || !nombre.trim() || !slug ? 'rgba(0,0,0,0.35)' : '#fff',
          border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, fontFamily: FONT,
          cursor: isLoading || !nombre.trim() || !slug ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'background 0.15s',
        }}
      >
        {isLoading ? (
          <>
            <span style={{
              width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
              borderRadius: '50%', display: 'inline-block', animation: 'creg-spin 0.7s linear infinite',
            }} />
            Creando tu plataforma...
          </>
        ) : 'Crear mi plataforma'}
      </button>

      <style>{`@keyframes creg-spin { to { transform: rotate(360deg) } }`}</style>
    </form>
  )
}
