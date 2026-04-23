'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Spinner({ message = 'Verificando cuenta' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <p className="text-xs text-black/30 tracking-widest uppercase">{message}</p>
    </div>
  )
}

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Iniciando...')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const errorParam = searchParams.get('error')
      const code = searchParams.get('code')

      if (errorParam) {
        setErrorMsg(`Error del proveedor: ${searchParams.get('error_description') ?? errorParam}`)
        return
      }

      // PKCE flow
      if (code) {
        setStatus('Intercambiando código...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          setErrorMsg(`Error PKCE: ${error?.message ?? 'Sin sesión'}`)
          return
        }
        await finish(data.session.user.id)
        return
      }

      // Implicit flow: wait briefly for Supabase to process hash tokens
      setStatus('Esperando sesión...')
      await new Promise(r => setTimeout(r, 800))

      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setStatus('Sesión encontrada, redirigiendo...')
        await finish(session.user.id)
        return
      }

      // Still no session — listen for it
      setStatus('Esperando autenticación...')
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          sub.unsubscribe()
          reject(new Error('Timeout: no se recibió sesión en 10 segundos'))
        }, 10000)

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, s) => {
          if (s && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            clearTimeout(timer)
            sub.unsubscribe()
            await finish(s.user.id)
            resolve()
          }
        })
      }).catch(e => { setErrorMsg(e.message) })
    }

    const finish = async (userId: string) => {
      setStatus('Verificando perfil...')
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, tenant_id, activo, role')
        .eq('id', userId)
        .single()

      if (pErr && pErr.code !== 'PGRST116') {
        setErrorMsg(`Error al leer perfil: ${pErr.message}`)
        return
      }

      setStatus(`Perfil: activo=${profile?.activo}, role=${profile?.role}, tenant=${profile?.tenant_id ? 'sí' : 'no'}`)

      await new Promise(r => setTimeout(r, 1500)) // show status briefly

      if (profile?.tenant_id) {
        router.replace('/')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const nombre = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
        const email = user?.email ?? ''
        router.replace(`/registro/completar?${new URLSearchParams({ nombre, email })}`)
      }
    }

    run()
  }, [router, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 px-6">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-2">Error de autenticación</p>
          <p className="text-xs text-red-600 font-mono">{errorMsg}</p>
          <button onClick={() => router.replace('/')} className="mt-4 text-xs underline text-red-500">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <p className="text-xs text-black/40 tracking-widest uppercase font-mono">{status}</p>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
