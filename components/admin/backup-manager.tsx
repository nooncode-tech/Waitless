'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, fontFamily: FONT }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#111' }}>Backup y Recuperación</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
          Exportá la configuración del sistema y accedé a los procedimientos de recuperación de emergencia.
        </p>
      </div>

      {/* Backup */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>◫</span>
            Exportar backup de configuración
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9CA3AF' }}>
            Descarga un archivo JSON con el menú, categorías, configuración del restaurante y distribución de mesas. No incluye pedidos ni datos de sesión.
          </p>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleExport}
            disabled={exportStatus === 'loading'}
            style={{
              height: 36, padding: '0 16px', borderRadius: 10, border: 'none',
              background: exportStatus === 'loading' ? '#6B7280' : '#111',
              color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              cursor: exportStatus === 'loading' ? 'not-allowed' : 'pointer',
              opacity: exportStatus === 'loading' ? 0.7 : 1,
              fontFamily: FONT,
            }}
          >
            {exportStatus === 'loading'
              ? <><span style={{ fontSize: 24, color: '#CCC' }}>↻</span> Generando backup…</>
              : <><span>↓</span> Descargar backup</>}
          </button>
          {exportStatus === 'ok' && (
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#059669' }} role="status">
              <span>✓</span> Backup descargado correctamente.
            </p>
          )}
          {exportStatus === 'error' && (
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#EF4444' }} role="alert">
              <span>✕</span> {exportError}
            </p>
          )}
        </div>
      </div>

      {/* Emergency access recovery */}
      <div style={{ border: '1px solid #FCD34D', borderRadius: 14, background: '#FFFBEB', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #FDE68A' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠</span>
            Recuperación de acceso de emergencia
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#B45309' }}>
            Si el único administrador quedó bloqueado o desactivado, seguí este procedimiento desde el Dashboard de Supabase.
          </p>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#92400E' }}>
            <li>Ingresá a <strong>Supabase Dashboard → SQL Editor</strong>.</li>
            <li>
              Encontrá el{' '}
              <code style={{ background: '#FEF3C7', padding: '1px 4px', borderRadius: 4, fontSize: 11, fontFamily: MONO }}>user_id</code>
              {' '}del usuario en la tabla{' '}
              <code style={{ background: '#FEF3C7', padding: '1px 4px', borderRadius: 4, fontSize: 11, fontFamily: MONO }}>profiles</code>
              {' '}o en Authentication → Users.
            </li>
            <li>
              Ejecutá el siguiente comando (reemplazando el UUID):
              <pre style={{ marginTop: 6, padding: 8, borderRadius: 8, background: '#FEF3C7', fontSize: 11, overflowX: 'auto', fontFamily: MONO }}>
                {`SELECT ensure_admin('uuid-del-usuario-aqui');`}
              </pre>
            </li>
            <li>Luego restablecé la contraseña desde <strong>Authentication → Users → Send recovery email</strong>.</li>
          </ol>
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#B45309' }}>
            La función{' '}
            <code style={{ fontFamily: MONO }}>ensure_admin()</code>
            {' '}está definida en{' '}
            <code style={{ fontFamily: MONO }}>supabase/028_admin_recovery.sql</code>.
            {' '}Solo es accesible con el rol{' '}
            <code style={{ fontFamily: MONO }}>service_role</code>.
          </p>
        </div>
      </div>

      {/* Password reset */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>◉</span>
            Resetear contraseña de un usuario
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9CA3AF' }}>
            Para resetear la contraseña de cualquier usuario del staff, usá el panel de Usuarios.
          </p>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
            Los resets de contraseña se gestionan desde{' '}
            <strong>Supabase Dashboard → Authentication → Users → Send recovery email</strong>,
            {' '}o mediante la opción de editar usuario en el panel de Usuarios de esta aplicación.
          </p>
        </div>
      </div>
    </div>
  )
}
