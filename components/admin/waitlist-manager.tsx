'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import type { WaitlistEntry } from '@/lib/store'
import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { S } from '@/lib/strings'
import { Plus, X } from 'lucide-react'

const ESTADO_LABELS: Record<WaitlistEntry['estado'], string> = {
  esperando: 'Esperando',
  asignada: 'Asignada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
}

const ESTADO_COLORS: Record<WaitlistEntry['estado'], string> = {
  esperando: 'bg-amber-100 text-amber-800',
  asignada:  'bg-emerald-100 text-[#06C167]',
  cancelada: 'bg-red-100 text-red-700',
  expirada:  'bg-gray-100 text-gray-500',
}

function formatMinutesAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  return `hace ${mins} min`
}

interface AddFormState { nombre: string; telefono: string; personas: string; notas: string }
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
    const tableConfig = tables.find(t => t.numero === mesa)
    if (tableConfig && tableConfig.estado === 'disponible') {
      updateTable(tableConfig.id, { estado: 'hold' })
    }
  }

  async function handleCancel(entry: WaitlistEntry) {
    await updateWaitlistEntry(entry.id, { estado: 'cancelada' })
  }

  return (
    <section aria-label={S.waitlistTitle} className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900">{S.waitlistTitle}</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${showForm ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-gray-900 hover:bg-black text-white'}`}
        >
          <Plus className="h-3 w-3" />{showForm ? S.cancel : S.waitlistAdd}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50" aria-label="Formulario agregar a lista de espera">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-gray-500">{S.waitlistName} *</span>
              <Input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="h-9 text-sm" placeholder="Ej: García" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">{S.waitlistPhone}</span>
              <Input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} type="tel" className="h-9 text-sm" placeholder="Ej: 11 1234-5678" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-gray-500">{S.waitlistGuests}</span>
              <Input type="number" min={1} max={20} value={form.personas} onChange={e => setForm(p => ({ ...p, personas: e.target.value }))} className="h-9 text-sm" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">{S.waitlistNotes}</span>
              <Input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} className="h-9 text-sm" placeholder="Ej: cumpleaños, silla de bebé" />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="h-8 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50">
              {S.cancel}
            </button>
            <button type="submit" disabled={submitting} className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50">
              {submitting ? S.loading : S.add}
            </button>
          </div>
        </form>
      )}

      {activeEntries.length === 0 ? (
        <EmptyState icon="⏳" title={S.emptyWaitlist} description={S.emptyWaitlistDesc} />
      ) : (
        <ul className="space-y-2" aria-label="Clientes en espera">
          {activeEntries.map(entry => (
            <WaitlistCard key={entry.id} entry={entry} onAssign={handleAssign} onCancel={handleCancel} onRemove={removeWaitlistEntry} />
          ))}
        </ul>
      )}

      {pastEntries.length > 0 && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer select-none">{pastEntries.length} entradas anteriores</summary>
          <ul className="mt-2 space-y-1">
            {pastEntries.map(entry => (
              <li key={entry.id} className="flex items-center gap-2 py-1 px-2 rounded-xl bg-gray-50">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_COLORS[entry.estado]}`}>
                  {ESTADO_LABELS[entry.estado]}
                </span>
                <span className="font-medium text-gray-900">{entry.nombre}</span>
                <span className="text-gray-400">{entry.personas} pers.</span>
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
    if (n > 0) { onAssign(entry, n); setAssigningMesa(false); setMesaValue('') }
  }

  return (
    <li className="border border-gray-100 rounded-2xl p-3 bg-white space-y-2" aria-label={`Entrada lista de espera: ${entry.nombre}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 truncate">{entry.nombre}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_COLORS[entry.estado]}`}>
              {ESTADO_LABELS[entry.estado]}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {entry.personas} {entry.personas === 1 ? 'persona' : 'personas'}
            {entry.telefono && ` · ${entry.telefono}`}
            {entry.mesaAsignada && ` · Mesa ${entry.mesaAsignada}`}
          </p>
          {entry.notas && <p className="text-xs text-gray-400 italic">{entry.notas}</p>}
          <p className="text-[10px] text-gray-400">{formatMinutesAgo(entry.createdAt)}</p>
        </div>

        {entry.estado === 'esperando' && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setAssigningMesa(v => !v)} aria-label="Asignar mesa" className="h-7 px-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold">
              Mesa
            </button>
            <button onClick={() => onCancel(entry)} aria-label="Cancelar entrada" className="h-7 w-7 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {(entry.estado === 'cancelada' || entry.estado === 'expirada') && (
          <button onClick={() => onRemove(entry.id)} aria-label="Eliminar entrada" className="h-7 px-2.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50">
            Eliminar
          </button>
        )}
      </div>

      {assigningMesa && (
        <form onSubmit={submitAssign} className="flex gap-2 items-center">
          <Input type="number" min={1} value={mesaValue} onChange={e => setMesaValue(e.target.value)} placeholder="Nro. de mesa" className="h-8 text-xs w-28" autoFocus />
          <button type="submit" className="h-8 px-3 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold">
            Asignar
          </button>
          <button type="button" onClick={() => setAssigningMesa(false)} className="h-8 px-2 rounded-xl text-xs text-gray-400 hover:bg-gray-100">
            {S.cancel}
          </button>
        </form>
      )}
    </li>
  )
}
