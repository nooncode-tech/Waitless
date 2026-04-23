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

async function redirectAfterSession(userId: string, router: ReturnType<typeof useRouter>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id')
    .eq('id', userId)
    .single()

  if (profile?.tenant_id) {
    router.replace('/')
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    const nombre = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
    const email = user?.email ?? ''
    router.replace(`/registro/completar?${new URLSearchParams({ nombre, email })}`)
  }
}

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const code = searchParams.get('code')

    if (errorParam) {
      setErrorMsg(`Error de proveedor: ${errorDescription ?? errorParam}`)
      return
    }

    let cancelled = false

    async function handle() {
      // Case 1: PKCE flow — code in query string
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error || !data.session) {
          setErrorMsg(`Error al autenticar: ${error?.message ?? 'Sin sesión'}`)
          return
        }
        await redirectAfterSession(data.session.user.id, router)
        return
      }

      // Case 2: Implicit flow — Supabase already processed the hash tokens
      // and fired SIGNED_IN before our listener registered. Check if session exists.
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (cancelled) return
      if (existing) {
        await redirectAfterSession(existing.user.id, router)
        return
      }

      // Case 3: Tokens in hash haven't been processed yet — wait for SIGNED_IN
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          subscription.unsubscribe()
          if (!cancelled) await redirectAfterSession(session.user.id, router)
        }
      })

      const timeout = setTimeout(() => {
        if (cancelled) return
        subscription.unsubscribe()
        setErrorMsg(
          'No se recibió código de autorización. ' +
          'Asegúrate de que la URL de callback esté en la lista de Redirect URLs en Supabase ' +
          '(Authentication → URL Configuration).'
        )
      }, 8000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeout)
      }
    }

    const cleanup = handle()
    return () => {
      cancelled = true
      cleanup.then(fn => fn?.())
    }
  }, [router, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 px-6">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-2">Error de autenticación</p>
          <p className="text-xs text-red-600">{errorMsg}</p>
          <button
            onClick={() => router.replace('/')}
            className="mt-4 text-xs underline text-red-500"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return <Spinner />
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
