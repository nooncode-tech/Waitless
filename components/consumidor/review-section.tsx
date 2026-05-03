'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, Send, LogIn, X, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface Review {
  id: string
  rating: number
  titulo: string | null
  comentario: string
  consumer_nombre: string
  respuesta_restaurante: string | null
  respondido_at: string | null
  created_at: string
}

interface Props {
  slug: string
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`h-7 w-7 transition-colors ${n <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

export function ReviewSection({ slug }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [isConsumer, setIsConsumer] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [titulo, setTitulo] = useState('')
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchReviews = useCallback(async () => {
    const res = await fetch(`/api/reviews?slug=${slug}`)
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setLoadingReviews(false)
  }, [slug])

  useEffect(() => {
    fetchReviews()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const res = await fetch('/api/consumidor/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setToken(session.access_token)
        setIsConsumer(true)
      }
    })
  }, [fetchReviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || rating === 0 || !comentario.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, rating, titulo: titulo.trim() || undefined, comentario: comentario.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setSubmitError(data.error ?? 'Error al enviar la reseña')
    } else {
      setSubmitSuccess(true)
      setShowForm(false)
      setRating(0)
      setTitulo('')
      setComentario('')
      fetchReviews()
    }
    setSubmitting(false)
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <section className="mt-8 px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-black text-gray-900 text-lg" style={{ letterSpacing: '-0.02em' }}>Reseñas</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-gray-900">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({reviews.length} reseña{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        {isConsumer && !submitSuccess && (
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-gray-900 text-white px-3.5 py-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <Star className="h-3.5 w-3.5" />
            Dejar reseña
          </button>
        )}

        {!isConsumer && (
          <a href="/consumidor"
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 px-3.5 py-2 rounded-full hover:border-gray-400 transition-colors">
            <LogIn className="h-3.5 w-3.5" />
            Iniciar sesión
          </a>
        )}
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-4 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          ¡Gracias por tu reseña! Ya aparece en la lista.
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">Tu opinión</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Calificación *</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <input
            type="text"
            placeholder="Título (opcional)"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
          />

          <textarea
            placeholder="Comentario *"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors resize-none"
          />

          {submitError && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{submitError}
            </div>
          )}

          <Button type="submit" className="w-full h-10" disabled={submitting || rating === 0 || !comentario.trim()}>
            {submitting
              ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <><Send className="h-3.5 w-3.5 mr-1.5" />Publicar reseña</>
            }
          </Button>
        </form>
      )}

      {/* Review list */}
      {loadingReviews ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <Star className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Todavía no hay reseñas. ¡Sé el primero!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{r.consumer_nombre}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(r.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.titulo && <p className="font-semibold text-sm text-gray-800 mb-1">{r.titulo}</p>}
              <p className="text-sm text-gray-600 leading-relaxed">{r.comentario}</p>
              {r.respuesta_restaurante && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 border-l-2 border-gray-300">
                  <p className="text-xs font-bold text-gray-500 mb-1">Respuesta del restaurante</p>
                  <p className="text-sm text-gray-700">{r.respuesta_restaurante}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
