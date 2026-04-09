'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Download,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  DatabaseBackup,
  KeyRound,
} from 'lucide-react'

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

      // Trigger descarga del archivo
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
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Backup y Recuperación</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Exportá la configuración del sistema y accedé a los procedimientos de recuperación de emergencia.
        </p>
      </div>

      {/* ── Backup de datos ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="h-5 w-5" />
            Exportar backup de configuración
          </CardTitle>
          <CardDescription>
            Descarga un archivo JSON con el menú, categorías, configuración del restaurante y distribución de mesas.
            No incluye pedidos ni datos de sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleExport}
            disabled={exportStatus === 'loading'}
            className="gap-2"
          >
            {exportStatus === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {exportStatus === 'loading' ? 'Generando backup…' : 'Descargar backup'}
          </Button>

          {exportStatus === 'ok' && (
            <p className="flex items-center gap-2 text-sm text-green-600" role="status">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Backup descargado correctamente.
            </p>
          )}
          {exportStatus === 'error' && (
            <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {exportError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Recuperación de acceso de emergencia ────────────────── */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            Recuperación de acceso de emergencia
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-500">
            Si el único administrador quedó bloqueado o desactivado, seguí este procedimiento desde el Dashboard de Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2 text-sm text-amber-800 dark:text-amber-400 list-decimal list-inside">
            <li>
              Ingresá a <strong>Supabase Dashboard → SQL Editor</strong>.
            </li>
            <li>
              Encontrá el <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">user_id</code> del usuario en la tabla <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">profiles</code> o en Authentication → Users.
            </li>
            <li>
              Ejecutá el siguiente comando (reemplazando el UUID):
              <pre className="mt-1 p-2 rounded bg-amber-100 dark:bg-amber-900 text-xs overflow-x-auto">
                {`SELECT ensure_admin('uuid-del-usuario-aqui');`}
              </pre>
            </li>
            <li>
              Luego restablecé la contraseña desde <strong>Authentication → Users → Send recovery email</strong>.
            </li>
          </ol>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
            La función <code>ensure_admin()</code> está definida en <code>supabase/028_admin_recovery.sql</code>.
            Solo es accesible con el rol <code>service_role</code>.
          </p>
        </CardContent>
      </Card>

      {/* ── Reset de contraseña de usuario ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            Resetear contraseña de un usuario
          </CardTitle>
          <CardDescription>
            Para resetear la contraseña de cualquier usuario del staff, usá el panel de Usuarios.
            Desde allí podés generar un enlace de reseteo o actualizar los datos del perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los resets de contraseña se gestionan desde <strong>Supabase Dashboard → Authentication → Users → Send recovery email</strong>,
            o mediante la opción de editar usuario en el panel de Usuarios de esta aplicación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
