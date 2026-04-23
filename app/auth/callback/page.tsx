'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')

    if (!code) {
      router.replace('/?error=oauth_no_code')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session) {
        router.replace('/?error=oauth_failed')
        return
      }

      // Verificar si ya tiene tenant (usuario existente) o es nuevo
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', data.session.user.id)
        .single()

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <p className="text-xs text-black/30 tracking-widest uppercase">Verificando cuenta</p>
    </div>
  )
}
