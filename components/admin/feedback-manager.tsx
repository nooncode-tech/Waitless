'use client'

import { useEffect, useState } from 'react'
import { Star, MessageSquare, TrendingUp } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/lib/store'

export function FeedbackManager() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setFeedbackList(data.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            mesa: row.mesa,
            rating: row.rating,
            comentario: row.comentario,
            createdAt: new Date(row.created_at),
          })))
        }
        setLoading(false)
      })
  }, [])

  const avgRating = feedbackList.length
    ? (feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length).toFixed(1)
    : '—'

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: feedbackList.filter(f => f.rating === star).length,
    pct: feedbackList.length
      ? Math.round((feedbackList.filter(f => f.rating === star).length / feedbackList.length) * 100)
      : 0,
  }))

  const promoters = feedbackList.filter(f => f.rating >= 4).length
  const nps = feedbackList.length
    ? Math.round((promoters / feedbackList.length) * 100)
    : 0

  return (
    <div className="p-4 space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-black">Feedback de clientes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{feedbackList.length} respuestas recibidas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-xl p-4 bg-white text-center">
          <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500 fill-yellow-500" />
          <p className="text-2xl font-bold text-black">{avgRating}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Promedio</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-white text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-success" />
          <p className="text-2xl font-bold text-black">{nps}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Satisfechos (≥4★)</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-white text-center">
          <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold text-black">{feedbackList.filter(f => f.comentario).length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Con comentario</p>
        </div>
      </div>

      {/* Distribution */}
      <div className="border border-border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold text-black uppercase tracking-wide">Distribución</p>
        </div>
        <div className="p-4 space-y-2">
          {distribution.map(d => (
            <div key={d.star} className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 w-16 shrink-0">
                {Array.from({ length: d.star }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="border border-border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold text-black uppercase tracking-wide">Últimos comentarios</p>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner className="size-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Cargando...</p>
            </div>
          ) : feedbackList.filter(f => f.comentario).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin comentarios aún</p>
          ) : (
            feedbackList.filter(f => f.comentario).slice(0, 20).map(f => (
              <div key={f.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i < f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-border'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Mesa {f.mesa} · {new Date(f.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-black">{f.comentario}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
