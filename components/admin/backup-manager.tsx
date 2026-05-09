'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, ShieldAlert, CheckCircle2, XCircle, DatabaseBackup, KeyRound } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type ExportStatus = 'idle' | 'loading' | 'ok' | 'error'

export function BackupManager() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport() {
    setExportStatus('loading')
    setExportError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No hay sesión activa')

      const res = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filename = res.headers.get('content-disposition')?.match(/filename="(.+?)"/)?.[1]
        ?? `waitless-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportStatus('ok')
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Error desconocido')
      setExportStatus('error')
    }
  }

  return (
    <div className="space-y-4 max-w-2xl" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div>
        <h2 className="text-sm font-black text-gray-900">Backup y Recuperación</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Exportá la configuración del sistema y accedé a los procedimientos de recuperación de emergencia.
        </p>
      </div>

      {/* Backup */}
      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
            <DatabaseBackup className="h-4 w-4 text-blue-500" />
            Exportar backup de configuración
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Descarga un archivo JSON con el menú, categorías, configuración del restaurante y distribución de mesas. No incluye pedidos ni datos de sesión.
          </p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <button
            onClick={handleExport}
            disabled={exportStatus === 'loading'}
            className="h-9 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {exportStatus === 'loading'
              ? <Spinner className="size-4" aria-hidden="true" />
              : <Download className="h-4 w-4" aria-hidden="true" />}
            {exportStatus === 'loading' ? 'Generando backup…' : 'Descargar backup'}
          </button>
          {exportStatus === 'ok' && (
            <p className="flex items-center gap-2 text-sm text-[#06C167]" role="status">
              <CheckCircle2 className="h-4 w-4" />Backup descargado correctamente.
            </p>
          )}
          {exportStatus === 'error' && (
            <p className="flex items-center gap-2 text-sm text-red-500" role="alert">
              <XCircle className="h-4 w-4" />{exportError}
            </p>
          )}
        </div>
      </div>

      {/* Emergency access recovery */}
      <div className="border border-amber-200 rounded-2xl bg-amber-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-200">
          <p className="text-xs font-black text-amber-800 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Recuperación de acceso de emergencia
          </p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            Si el único administrador quedó bloqueado o desactivado, seguí este procedimiento desde el Dashboard de Supabase.
          </p>
        </div>
        <div className="px-4 py-3">
          <ol className="space-y-2 text-sm text-amber-800 list-decimal list-inside">
            <li>Ingresá a <strong>Supabase Dashboard → SQL Editor</strong>.</li>
            <li>Encontrá el <code className="bg-amber-100 px-1 rounded text-xs">user_id</code> del usuario en la tabla <code className="bg-amber-100 px-1 rounded text-xs">profiles</code> o en Authentication → Users.</li>
            <li>
              Ejecutá el siguiente comando (reemplazando el UUID):
              <pre className="mt-1 p-2 rounded bg-amber-100 text-xs overflow-x-auto">
                {`SELECT ensure_admin('uuid-del-usuario-aqui');`}
              </pre>
            </li>
            <li>Luego restablecé la contraseña desde <strong>Authentication → Users → Send recovery email</strong>.</li>
          </ol>
          <p className="text-xs text-amber-600 mt-2">
            La función <code>ensure_admin()</code> está definida en <code>supabase/028_admin_recovery.sql</code>. Solo es accesible con el rol <code>service_role</code>.
          </p>
        </div>
      </div>

      {/* Password reset */}
      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
            <KeyRound className="h-4 w-4 text-gray-500" />
            Resetear contraseña de un usuario
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Para resetear la contraseña de cualquier usuario del staff, usá el panel de Usuarios.
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500">
            Los resets de contraseña se gestionan desde <strong>Supabase Dashboard → Authentication → Users → Send recovery email</strong>, o mediante la opción de editar usuario en el panel de Usuarios de esta aplicación.
          </p>
        </div>
      </div>
    </div>
  )
}
