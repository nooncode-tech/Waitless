'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const errorParam = searchParams.get('error')
      if (errorParam) {
        setErrorMsg(searchParams.get('error_description') ?? errorParam)
        return
      }

      const code = searchParams.get('code')
      let userId: string
      let userMeta: Record<string, string> = {}
      let userEmail = ''

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          setErrorMsg(error?.message ?? 'No se pudo iniciar sesión')
          return
        }
        userId = data.session.user.id
        userMeta = (data.session.user.user_metadata ?? {}) as Record<string, string>
        userEmail = data.session.user.email ?? ''
      } else {
        await new Promise(r => setTimeout(r, 800))
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setErrorMsg('No se recibió sesión'); return }
        userId = session.user.id
        userMeta = (session.user.user_metadata ?? {}) as Record<string, string>
        userEmail = session.user.email ?? ''
      }

      // Complete consumer profile via API
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      if (!activeSession) { setErrorMsg('Sin sesión activa'); return }

      const res = await fetch('/api/consumidor/google-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({
          nombre: userMeta.given_name ?? userMeta.full_name?.split(' ')[0] ?? userMeta.name ?? '',
          apellido: userMeta.family_name ?? userMeta.full_name?.split(' ').slice(1).join(' ') ?? '',
          email: userEmail,
          avatarUrl: userMeta.avatar_url ?? userMeta.picture ?? null,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json.error ?? 'Error al completar el perfil')
        return
      }

      router.replace('/consumidor/perfil')
    }

    run()
  }, [router, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 px-6">
        <div className="max-w-sm w-full bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-red-700 mb-2">Error al iniciar sesión</p>
          <p className="text-xs text-red-600 font-mono">{errorMsg}</p>
          <button
            onClick={() => router.replace('/consumidor')}
            className="mt-5 h-10 px-6 rounded-xl bg-black text-white text-sm font-semibold"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <p className="text-xs text-black/30 tracking-widest uppercase">Iniciando sesión...</p>
    </div>
  )
}

export default function ConsumerAuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
        <p className="text-xs text-black/30 tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  )
}
