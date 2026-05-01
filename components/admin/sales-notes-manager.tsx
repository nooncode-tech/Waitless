'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Printer, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SalesNoteRow {
  id: string
  numero_interno: string
  status: string
  subtotal: number
  descuentos_total: number
  impuestos_total: number
  total: number
  moneda: string
  snapshot_items: unknown[]
  generated_at: string
  voided_at: string | null
  void_reason: string | null
  table_sessions: { id: string; mesa: number } | null
  payments: {
    id: string
    monto_requerido: number
    moneda: string
    payment_methods: { nombre: string; tipo: string } | null
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EMITIDA_INTERNAMENTE: 'Emitida',
  ANULADA: 'Anulada',
  CORREGIDA: 'Corregida',
  EXPORTADA: 'Exportada',
}

const STATUS_STYLE: Record<string, string> = {
  BORRADOR: 'bg-muted text-muted-foreground',
  EMITIDA_INTERNAMENTE: 'bg-success/10 text-success border-success/30',
  ANULADA: 'bg-destructive/10 text-destructive border-destructive/30',
  CORREGIDA: 'bg-warning/10 text-warning border-warning/30',
  EXPORTADA: 'bg-primary/10 text-primary border-primary/30',
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function SalesNotesManager() {
  const { config } = useApp()
  const [notes, setNotes] = useState<SalesNoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('EMITIDA_INTERNAMENTE')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/sales-notes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setNotes(json.notes ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handlePrint = (note: SalesNoteRow) => {
    const items = (note.snapshot_items ?? []) as Array<{
      nombre?: string
      cantidad?: number
      precio?: number
      total?: number
    }>

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Nota de venta ${note.numero_interno}</title>
        <style>
          body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 16px; }
          h1 { font-size: 14px; font-weight: bold; text-align: center; margin: 0 0 4px; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
          .small { font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>${config.restaurantName ?? 'WAITLESS'}</h1>
        <p class="center small">Nota de venta interna</p>
        <div class="divider"></div>
        <p class="center bold">${note.numero_interno}</p>
        <p class="center small">${new Date(note.generated_at).toLocaleString('es-VE')}</p>
        <p class="center small">Mesa ${note.table_sessions?.mesa ?? '—'}</p>
        <div class="divider"></div>
        ${items.length > 0 ? items.map(it => `
          <div class="row">
            <span>${it.cantidad ?? 1}x ${it.nombre ?? 'Ítem'}</span>
            <span>${note.moneda} ${((it.total ?? it.precio ?? 0)).toFixed(2)}</span>
          </div>
        `).join('') : '<p class="center small">(sin detalle de ítems)</p>'}
        <div class="divider"></div>
        <div class="row"><span>Subtotal</span><span>${note.moneda} ${note.subtotal.toFixed(2)}</span></div>
        ${note.descuentos_total > 0 ? `<div class="row"><span>Descuento</span><span>- ${note.moneda} ${note.descuentos_total.toFixed(2)}</span></div>` : ''}
        ${note.impuestos_total > 0 ? `<div class="row"><span>Impuesto</span><span>${note.moneda} ${note.impuestos_total.toFixed(2)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row bold"><span>TOTAL</span><span>${note.moneda} ${note.total.toFixed(2)}</span></div>
        ${note.payments?.payment_methods ? `
        <div class="divider"></div>
        <p class="center small">Pagado con: ${note.payments.payment_methods.nombre}</p>
        ` : ''}
        <div class="divider"></div>
        <p class="center small">Documento interno — no válido como factura fiscal</p>
        <p class="center small">WAITLESS</p>
      </body>
      </html>
    `
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de venta
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro de ventas validadas — generadas al aprobar cada comprobante
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchNotes}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" />
        Cada nota se genera automáticamente al aprobar un comprobante de pago. Son inmutables y quedan en el historial permanentemente.
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {(['EMITIDA_INTERNAMENTE', 'ANULADA', 'EXPORTADA', ''] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors',
              filterStatus === s
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            )}
          >
            {s ? STATUS_LABELS[s] : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-10">Cargando…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay notas de venta en este estado</p>
          <p className="text-xs text-muted-foreground mt-1">Se generan automáticamente al aprobar un comprobante</p>
        </div>
      ) : (
        <div className="space-y-2" ref={printRef}>
          {notes.map(note => {
            const isExpanded = expandedId === note.id
            const items = (note.snapshot_items ?? []) as Array<{
              nombre?: string; cantidad?: number; precio?: number; total?: number
            }>

            return (
              <div key={note.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-foreground truncate">
                        {note.numero_interno}
                      </span>
                      <span className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                        STATUS_STYLE[note.status] ?? 'bg-muted text-muted-foreground'
                      )}>
                        {STATUS_LABELS[note.status] ?? note.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Mesa {note.table_sessions?.mesa ?? '—'}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        {note.moneda} {note.total.toFixed(2)}
                      </span>
                      <span>·</span>
                      <span>{new Date(note.generated_at).toLocaleDateString('es-VE')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={e => { e.stopPropagation(); handlePrint(note) }}
                      title="Imprimir nota"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border space-y-3">
                    {/* Método de pago */}
                    {note.payments?.payment_methods && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Download className="h-3 w-3" />
                        Pagado con: <span className="font-medium text-foreground">{note.payments.payment_methods.nombre}</span>
                      </div>
                    )}

                    {/* Detalle de ítems */}
                    {items.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ítems</p>
                        {items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-foreground">
                              {item.cantidad ?? 1}× {item.nombre ?? 'Ítem'}
                            </span>
                            <span className="text-foreground font-medium">
                              {note.moneda} {(item.total ?? item.precio ?? 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin detalle de ítems disponible</p>
                    )}

                    {/* Totales */}
                    <div className="pt-2 border-t border-dashed border-border space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{note.moneda} {note.subtotal.toFixed(2)}</span>
                      </div>
                      {note.descuentos_total > 0 && (
                        <div className="flex justify-between text-xs text-success">
                          <span>Descuento</span>
                          <span>– {note.moneda} {note.descuentos_total.toFixed(2)}</span>
                        </div>
                      )}
                      {note.impuestos_total > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Impuesto</span>
                          <span>{note.moneda} {note.impuestos_total.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                        <span>Total</span>
                        <span>{note.moneda} {note.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Anulación */}
                    {note.voided_at && (
                      <div className="p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                          <XCircle className="h-3.5 w-3.5" />
                          Anulada el {new Date(note.voided_at).toLocaleDateString('es-VE')}
                        </div>
                        {note.void_reason && (
                          <p className="text-xs text-destructive/70 mt-0.5">{note.void_reason}</p>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 gap-2 mt-1"
                      onClick={() => handlePrint(note)}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir / Guardar PDF
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
