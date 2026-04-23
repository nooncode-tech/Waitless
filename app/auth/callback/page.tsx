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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Supabase / Google passed back an error directly
    if (errorParam) {
      setErrorMsg(`Error de proveedor: ${errorDescription ?? errorParam}`)
      return
    }

    if (!code) {
      setErrorMsg('No se recibió el código de autorización. Verifica la configuración de Redirect URLs en Supabase.')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session) {
        setErrorMsg(`Error al intercambiar código: ${error?.message ?? 'Sin sesión'}`)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', data.session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = row not found, which is fine for new users
        setErrorMsg(`Error al obtener perfil: ${profileError.message}`)
        return
      }

      if (profile?.tenant_id) {
        router.replace('/')
      } else {
        const user = data.session.user
        const nombre = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
        const email = user.email ?? ''
        const params = new URLSearchParams({ nombre, email })
        router.replace(`/registro/completar?${params.toString()}`)
      }
    })
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
