'use client'

// P2-3: Waitlist manager — real-time list of waiting guests with assign/cancel actions

import { useState } from 'react'
import { useApp } from '@/lib/context'
import type { WaitlistEntry } from '@/lib/store'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { S } from '@/lib/strings'

const ESTADO_LABELS: Record<WaitlistEntry['estado'], string> = {
  esperando: 'Esperando',
  asignada: 'Asignada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
}

const ESTADO_COLORS: Record<WaitlistEntry['estado'], string> = {
  esperando: 'bg-yellow-100 text-yellow-800',
  asignada:  'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  expirada:  'bg-gray-100 text-gray-500',
}

function formatMinutesAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  return `hace ${mins} min`
}

interface AddFormState {
  nombre: string
  telefono: string
  personas: string
  notas: string
}

const EMPTY_FORM: AddFormState = { nombre: '', telefono: '', personas: '2', notas: '' }

export function WaitlistManager() {
  const { waitlist, addToWaitlist, updateWaitlistEntry, removeWaitlistEntry, tables, updateTable } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const activeEntries = waitlist.filter(e => e.estado === 'esperando' || e.estado === 'asignada')
  const pastEntries   = waitlist.filter(e => e.estado === 'cancelada' || e.estado === 'expirada')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSubmitting(true)
    try {
      await addToWaitlist({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        personas: Math.max(1, parseInt(form.personas, 10) || 1),
        notas: form.notas.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssign(entry: WaitlistEntry, mesa: number) {
    await updateWaitlistEntry(entry.id, { estado: 'asignada', mesaAsignada: mesa })
    // Poner la mesa en HOLD para reservarla visualmente
    const tableConfig = tables.find(t => t.numero === mesa)
    if (tableConfig && tableConfig.estado === 'disponible') {
      updateTable(tableConfig.id, { estado: 'hold' })
    }
  }

  async function handleCancel(entry: WaitlistEntry) {
    await updateWaitlistEntry(entry.id, { estado: 'cancelada' })
  }

  return (
    <section aria-label={S.waitlistTitle} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{S.waitlistTitle}</h2>
        <Button size="sm" variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(v => !v)}>
          {showForm ? S.cancel : S.waitlistAdd}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="border rounded-xl p-4 space-y-3 bg-muted"
          aria-label="Formulario agregar a lista de espera"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{S.waitlistName} *</span>
              <Input
                required
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                className="h-9 text-sm"
                placeholder="Ej: García"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{S.waitlistPhone}</span>
              <Input
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                type="tel"
                className="h-9 text-sm"
                placeholder="Ej: 11 1234-5678"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{S.waitlistGuests}</span>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.personas}
                onChange={e => setForm(p => ({ ...p, personas: e.target.value }))}
                className="h-9 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{S.waitlistNotes}</span>
              <Input
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                className="h-9 text-sm"
                placeholder="Ej: cumpleaños, silla de bebé"
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
            >
              {S.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
            >
              {submitting ? S.loading : S.add}
            </Button>
          </div>
        </form>
      )}

      {/* Active list */}
      {activeEntries.length === 0 ? (
        <EmptyState
          icon="⏳"
          title={S.emptyWaitlist}
          description={S.emptyWaitlistDesc}
        />
      ) : (
        <ul className="space-y-2" aria-label="Clientes en espera">
          {activeEntries.map(entry => (
            <WaitlistCard
              key={entry.id}
              entry={entry}
              onAssign={handleAssign}
              onCancel={handleCancel}
              onRemove={removeWaitlistEntry}
            />
          ))}
        </ul>
      )}

      {/* Past entries (collapsed) */}
      {pastEntries.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {pastEntries.length} entradas anteriores
          </summary>
          <ul className="mt-2 space-y-1">
            {pastEntries.map(entry => (
              <li
                key={entry.id}
                className="flex items-center gap-2 py-1 px-2 rounded bg-muted"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ESTADO_COLORS[entry.estado]}`}>
                  {ESTADO_LABELS[entry.estado]}
                </span>
                <span className="font-medium text-foreground">{entry.nombre}</span>
                <span className="text-muted-foreground">{entry.personas} pers.</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

interface WaitlistCardProps {
  entry: WaitlistEntry
  onAssign: (entry: WaitlistEntry, mesa: number) => void
  onCancel: (entry: WaitlistEntry) => void
  onRemove: (id: string) => void
}

function WaitlistCard({ entry, onAssign, onCancel, onRemove }: WaitlistCardProps) {
  const [assigningMesa, setAssigningMesa] = useState(false)
  const [mesaValue, setMesaValue] = useState('')

  function submitAssign(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(mesaValue, 10)
    if (n > 0) {
      onAssign(entry, n)
      setAssigningMesa(false)
      setMesaValue('')
    }
  }

  return (
    <li
      className="border rounded-xl p-3 bg-white shadow-sm space-y-2"
      aria-label={`Entrada lista de espera: ${entry.nombre}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{entry.nombre}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ESTADO_COLORS[entry.estado]}`}>
              {ESTADO_LABELS[entry.estado]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {entry.personas} {entry.personas === 1 ? 'persona' : 'personas'}
            {entry.telefono && ` · ${entry.telefono}`}
            {entry.mesaAsignada && ` · Mesa ${entry.mesaAsignada}`}
          </p>
          {entry.notas && (
            <p className="text-xs text-muted-foreground italic">{entry.notas}</p>
          )}
          <p className="text-[10px] text-muted-foreground">{formatMinutesAgo(entry.createdAt)}</p>
        </div>

        {/* Actions */}
        {entry.estado === 'esperando' && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="xs"
              onClick={() => setAssigningMesa(v => !v)}
              aria-label="Asignar mesa"
            >
              Mesa
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onCancel(entry)}
              aria-label="Cancelar entrada"
            >
              ✕
            </Button>
          </div>
        )}
        {(entry.estado === 'cancelada' || entry.estado === 'expirada') && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onRemove(entry.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Eliminar entrada"
          >
            Eliminar
          </Button>
        )}
      </div>

      {assigningMesa && (
        <form onSubmit={submitAssign} className="flex gap-2 items-center">
          <Input
            type="number"
            min={1}
            value={mesaValue}
            onChange={e => setMesaValue(e.target.value)}
            placeholder="Nro. de mesa"
            className="h-8 text-xs w-28"
            autoFocus
          />
          <Button
            type="submit"
            size="xs"
            className="bg-success hover:bg-success/90"
          >
            Asignar
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setAssigningMesa(false)}
            className="text-muted-foreground"
          >
            {S.cancel}
          </Button>
        </form>
      )}
    </li>
  )
}
