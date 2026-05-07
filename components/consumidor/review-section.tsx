'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, Send, LogIn, X, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`h-8 w-8 transition-colors ${n <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
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

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-black text-gray-900 text-lg" style={{ letterSpacing: '-0.02em' }}>Reseñas</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-gray-900">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">
                ({reviews.length} reseña{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {isConsumer && !submitSuccess && (
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1.5 text-xs font-bold bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <Star className="h-3.5 w-3.5" />
            Dejar reseña
          </button>
        )}

        {!isConsumer && (
          <a
            href="/consumidor"
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 px-4 py-2 rounded-full hover:border-gray-400 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar sesión
          </a>
        )}
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div className="flex items-center gap-2 bg-[#E8F9F1] border border-[#06C167]/20 rounded-2xl px-4 py-3 mb-4 text-sm text-[#1A7A47] font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          ¡Gracias por tu reseña! Ya aparece en la lista.
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-gray-900 text-sm">Tu opinión</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Calificación *
              </p>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            <input
              type="text"
              placeholder="Título (opcional)"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
            />

            <textarea
              placeholder="Comentario *"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
            />

            {submitError && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating === 0 || !comentario.trim()}
              className="w-full h-12 bg-black hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="h-3.5 w-3.5" />Publicar reseña</>
              }
            </button>
          </form>
        </div>
      )}

      {/* Review list */}
      {loadingReviews ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center">
          <Star className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Todavía no hay reseñas</p>
          <p className="text-xs text-gray-400 mt-1">¡Sé el primero en dejar una opinión!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-sm text-gray-900">{r.consumer_nombre}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(r.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.titulo && (
                <p className="font-semibold text-sm text-gray-800 mb-1">{r.titulo}</p>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">{r.comentario}</p>
              {r.respuesta_restaurante && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 border-l-2 border-gray-300">
                  <p className="text-xs font-bold text-gray-500 mb-1">Respuesta del restaurante</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.respuesta_restaurante}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
