'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle2, Upload, Hash, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface PaymentMethodPublic {
  id: string
  nombre: string
  tipo: string
  moneda: string
  instrucciones: string
  datosPago: Record<string, string>
  requiereComprobante: boolean
}

interface PaymentSubmitViewProps {
  sessionId: string
  tenantId: string
  totalMonto: number
  onBack: () => void
  onSubmitted: () => void
}

type Step = 'select' | 'detail' | 'submitted'

const DATO_LABELS: Record<string, string> = {
  banco: 'Banco',
  telefono: 'Teléfono',
  titular: 'Titular',
  cedula: 'Cédula',
  cuenta: 'N° de cuenta',
  email: 'Correo',
  referencia: 'Referencia',
}

export function PaymentSubmitView({
  sessionId,
  tenantId,
  totalMonto,
  onBack,
  onSubmitted,
}: PaymentSubmitViewProps) {
  const [step, setStep] = useState<Step>('select')
  const [methods, setMethods] = useState<PaymentMethodPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentMethodPublic | null>(null)
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState(totalMonto.toFixed(2))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payment-methods?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(j => setMethods(j.methods ?? []))
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSelectMethod = (m: PaymentMethodPublic) => {
    setSelected(m)
    setReferencia('')
    setSubmitError(null)
    setStep('detail')
  }

  const handleSubmit = async () => {
    if (!selected) return
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setSubmitError('Ingresa el monto pagado')
      return
    }
    if (selected.requiereComprobante && !referencia.trim()) {
      setSubmitError('La referencia o número de operación es obligatorio')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          paymentMethodId: selected.id,
          referencia: referencia.trim() || undefined,
          montoDeclarado: montoNum,
          fileType: 'referencia',
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setSubmitError(j.error ?? 'Error al enviar. Intenta de nuevo.')
        return
      }
      setStep('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Submitted ───
  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">¡Comprobante enviado!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              El restaurante revisará tu pago y te confirmará en breve.
            </p>
          </div>
          <Button className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background" onClick={onSubmitted}>
            Volver al menú
          </Button>
        </div>
      </div>
    )
  }

  // ─── Detail ───
  if (step === 'detail' && selected) {
    const datos = Object.entries(selected.datosPago ?? {}).filter(([, v]) => v)

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => setStep('select')}
            className="flex items-center justify-center h-10 w-10 -ml-2 rounded-xl hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-bold text-foreground">{selected.nombre}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Datos de pago del restaurante */}
          {datos.length > 0 && (
            <div className="p-4 bg-muted/40 rounded-2xl space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos de pago</p>
              {datos.map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{DATO_LABELS[key] ?? key}</span>
                  <span className="text-sm font-semibold text-foreground font-mono">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Instrucciones */}
          {selected.instrucciones && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <p className="text-sm text-foreground">{selected.instrucciones}</p>
            </div>
          )}

          {/* Monto a pagar */}
          <div>
            <Label className="text-xs text-muted-foreground">Monto pagado ({selected.moneda})</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="mt-1.5 h-12 text-lg font-bold"
            />
          </div>

          {/* Referencia / número de operación */}
          {selected.requiereComprobante && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                Número de referencia / operación
              </Label>
              <Input
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="ej. 012345678"
                className="mt-1.5 h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Puedes enviar la captura de pantalla al mesero si lo prefieres.
              </p>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </div>

        <div className="p-4 border-t border-border" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <Button
            className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background text-sm font-bold rounded-xl"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Confirmar pago'}
          </Button>
        </div>
      </div>
    )
  }

  // ─── Select method ───
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-10 w-10 -ml-2 rounded-xl hover:bg-muted/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="text-base font-bold text-foreground">Pagar cuenta</span>
          <p className="text-xs text-muted-foreground">Total: ${totalMonto.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Selecciona cómo quieres pagar:</p>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Cargando opciones…</div>
        ) : methods.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">
              No hay métodos de pago configurados.<br />Por favor llama al mesero.
            </p>
          </div>
        ) : (
          methods.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelectMethod(m)}
              className={cn(
                'w-full flex items-center justify-between p-4 border border-border rounded-2xl',
                'hover:bg-muted/30 active:scale-[0.98] transition-all text-left'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{m.nombre}</p>
                {m.instrucciones && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.instrucciones}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
