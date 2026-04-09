'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import { generateId } from '../store'
import { executeOrQueue } from '../offline-queue'
import type { AuditLog } from '../store'

type SetState = Dispatch<SetStateAction<AppState>>

export function logAction(
  currentUserId: string | undefined,
  setState: SetState,
  accion: string,
  detalles: string,
  entidad: string,
  entidadId: string,
  opts?: { razon?: string; antes?: Record<string, unknown>; despues?: Record<string, unknown> }
): void {
  const log: AuditLog = {
    id: generateId(),
    userId: currentUserId || 'anonymous',
    accion,
    detalles,
    entidad,
    entidadId,
    createdAt: new Date(),
    razon: opts?.razon,
    antes: opts?.antes,
    despues: opts?.despues,
  }

  setState(prev => ({
    ...prev,
    auditLogs: [...prev.auditLogs, log],
  }))

  // Persistir en Supabase (async, no bloqueante)
  executeOrQueue({
    table: 'audit_logs',
    type: 'insert',
    data: {
      id: log.id,
      user_id: log.userId,
      accion: log.accion,
      detalles: log.detalles,
      entidad: log.entidad,
      entidad_id: log.entidadId,
      razon: log.razon ?? null,
      antes: log.antes ?? null,
      despues: log.despues ?? null,
    },
  })
}
