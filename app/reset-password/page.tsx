'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // INITIAL_SESSION fires immediately on mount with any stored session (covers the
    // redirect case where app-client-root already processed the hash).
    // PASSWORD_RECOVERY fires when the page loads directly with the hash in the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        (event === 'INITIAL_SESSION' && !!session)
      ) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(`Error: ${error.message}`)
      } else {
        setDone(true)
        setTimeout(() => router.replace('/'), 3000)
      }
    } catch (err) {
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-background" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nueva contraseña</p>
          <p className="text-xs text-muted-foreground mt-1">Creá una contraseña segura para tu cuenta</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">¡Contraseña actualizada!</p>
            <p className="text-xs text-muted-foreground">Redirigiendo al inicio de sesión…</p>
          </div>
        ) : !ready ? (
          <div className="text-center py-10">
            <div className="h-6 w-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Verificando enlace…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
              disabled={isLoading}
            />

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading || !password || !confirm}
            >
              {isLoading ? (
                <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Guardar contraseña
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
