'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Ocurrió un error inesperado. Si el problema persiste, contactá soporte.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-gray-300 mb-5">ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    </div>
  )
}
