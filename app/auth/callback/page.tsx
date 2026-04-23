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

async function redirectAfterAuth(userId: string, router: ReturnType<typeof useRouter>) {
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

    // PKCE flow: exchange code for session
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error || !data.session) {
          setErrorMsg(`Error al autenticar: ${error?.message ?? 'Sin sesión'}`)
          return
        }
        await redirectAfterAuth(data.session.user.id, router)
      })
      return
    }

    // Implicit flow: Supabase puts tokens in the URL hash and handles them automatically.
    // We listen for the SIGNED_IN event which fires after the client processes the hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        await redirectAfterAuth(session.user.id, router)
      }
    })

    // Timeout: if neither code nor hash token detected after 8s, show error
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      setErrorMsg('No se recibió código de autorización. Asegúrate de que la URL de callback esté en la lista de Redirect URLs de Supabase.')
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
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
