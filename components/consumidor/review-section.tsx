'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

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
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            fontSize: 28,
            color: n <= (hover || value) ? '#F59E0B' : '#E5E7EB',
            lineHeight: 1,
            transition: 'color 0.12s',
          }}
        >★</button>
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 14px',
    border: '1px solid #E5E5E5',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: FONT,
    color: '#000',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <section style={{ marginTop: 32, padding: '0 16px 40px', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontWeight: 900, color: '#000', fontSize: 18, letterSpacing: '-0.02em', margin: 0 }}>Reseñas</h2>
          {reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 14, color: '#F59E0B' }}>★</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{avgRating.toFixed(1)}</span>
              <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)' }}>
                ({reviews.length} reseña{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {isConsumer && !submitSuccess && (
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, fontFamily: FONT,
              background: '#000', color: '#fff',
              padding: '7px 16px', borderRadius: 999,
              border: 'none', cursor: 'pointer',
            }}
          >
            <span>★</span> Dejar reseña
          </button>
        )}

        {!isConsumer && (
          <a
            href="/consumidor"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: FONT,
              color: 'rgba(0,0,0,0.6)', textDecoration: 'none',
              border: '1px solid #E5E5E5', padding: '7px 16px', borderRadius: 999,
            }}
          >
            → Iniciar sesión
          </a>
        )}
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#E8F9F1', border: '1px solid rgba(6,193,103,0.2)',
          borderRadius: 16, padding: '12px 16px', marginBottom: 16,
          fontSize: 14, color: '#1A7A47', fontWeight: 500,
        }}>
          <span style={{ flexShrink: 0 }}>✓</span>
          ¡Gracias por tu reseña! Ya aparece en la lista.
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#000', fontSize: 14, margin: 0 }}>Tu opinión</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(0,0,0,0.4)', fontSize: 16,
              }}
            >✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: MONO,
              }}>
                Calificación *
              </p>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            <input
              type="text"
              placeholder="Título (opcional)"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              style={inputStyle}
            />

            <textarea
              placeholder="Comentario *"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '12px 14px',
                resize: 'none',
                lineHeight: 1.5,
              }}
            />

            {submitError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#DC2626', fontSize: 12,
                background: '#FEF2F2', borderRadius: 10, padding: '10px 12px',
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating === 0 || !comentario.trim()}
              style={{
                width: '100%', height: 44,
                background: submitting || rating === 0 || !comentario.trim() ? '#E5E5E5' : '#000',
                color: submitting || rating === 0 || !comentario.trim() ? 'rgba(0,0,0,0.35)' : '#fff',
                fontWeight: 700, fontSize: 14, fontFamily: FONT,
                border: 'none', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {submitting
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'rev-spin 0.7s linear infinite' }} />
                : <><span>→</span> Publicar reseña</>
              }
            </button>
          </form>

          <style>{`@keyframes rev-spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Review list */}
      {loadingReviews ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid #E5E5E5', borderTopColor: '#666', borderRadius: '50%', animation: 'rev-spin 0.7s linear infinite' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '40px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, color: '#E5E5E5', marginBottom: 12 }}>★</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Todavía no hay reseñas</p>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', marginTop: 4 }}>¡Sé el primero en dejar una opinión!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} style={{
              background: '#fff', borderRadius: 16, padding: 16,
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#000', margin: 0 }}>{r.consumer_nombre}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} style={{ fontSize: 12, color: i < r.rating ? '#F59E0B' : '#E5E7EB' }}>★</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', flexShrink: 0, fontFamily: MONO }}>
                  {new Date(r.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.titulo && (
                <p style={{ fontWeight: 600, fontSize: 14, color: '#111', marginBottom: 4 }}>{r.titulo}</p>
              )}
              <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)', lineHeight: 1.6, margin: 0 }}>{r.comentario}</p>
              {r.respuesta_restaurante && (
                <div style={{
                  marginTop: 12, background: '#F9FAFB', borderRadius: 10, padding: 12,
                  borderLeft: '2px solid #D1D5DB',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.4)', marginBottom: 4, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Respuesta del restaurante
                  </p>
                  <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.7)', lineHeight: 1.6, margin: 0 }}>{r.respuesta_restaurante}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
