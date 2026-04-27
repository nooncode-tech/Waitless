'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface Props {
  onClose: () => void
}

type Step = 'warning' | 'confirm' | 'done'

export function DeleteAccountDialog({ onClose }: Props) {
  const [step, setStep] = useState<Step>('warning')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('Ingresá tu contraseña para confirmar')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('No hay sesión activa. Recargá la página.')
        return
      }

      const res = await fetch('/api/admin/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error inesperado')
        return
      }

      // Cerrar sesión localmente y redirigir
      await supabase.auth.signOut()
      setStep('done')
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso: éxito ─────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="font-black text-xl text-foreground mb-2 tracking-tight">
            Cuenta eliminada
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Tu cuenta y todos los datos del restaurante fueron eliminados permanentemente.
          </p>
          <Button
            onClick={() => { window.location.href = '/' }}
            className="w-full h-11 rounded-xl"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  // ── Paso: advertencia ────────────────────────────────────────────────────────

  if (step === 'warning') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="font-black text-base text-foreground tracking-tight">
                Eliminar cuenta
              </h2>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta acción es <span className="font-bold text-foreground">permanente e irreversible</span>. Se eliminarán:
            </p>
            <ul className="space-y-2">
              {[
                'Tu cuenta y acceso a la plataforma',
                'Menú, categorías e ingredientes',
                'Historial de órdenes y sesiones',
                'Configuración y branding del restaurante',
                'Datos de inventario y reportes',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                Solo puedes eliminar tu cuenta si no tienes órdenes activas ni mesas abiertas.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setStep('confirm')}
              className="flex-1 h-11 rounded-xl"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Paso: confirmación con contraseña ────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-black text-base text-foreground tracking-tight">
              Confirmar eliminación
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ingresá tu contraseña para confirmar que sos vos quien solicita la eliminación.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
                placeholder="Tu contraseña actual"
                className="h-11 rounded-xl pr-10 focus-visible:border-red-400 focus-visible:ring-red-400/20"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-red-700">
              ⚠️ Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep('warning')}
            className="flex-1 h-11 rounded-xl"
            disabled={loading}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !password.trim()}
            className="flex-1 h-11 rounded-xl gap-2"
          >
            {loading ? (
              <>
                <Spinner className="size-4" />
                Eliminando...
              </>
            ) : (
              'Eliminar cuenta'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
