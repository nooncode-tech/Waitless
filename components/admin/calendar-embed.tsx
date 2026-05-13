'use client'

import { useState } from 'react'
import { CalendarDays, ExternalLink, ChevronDown } from 'lucide-react'

const PRESETS = [
  { label: 'Onboarding Waitless', url: 'https://cal.com/waitless/onboarding' },
  { label: 'Soporte técnico', url: 'https://cal.com/waitless/soporte' },
  { label: 'Demo personalizada', url: 'https://cal.com/waitless/demo' },
]

export function CalendarEmbed() {
  const [selected, setSelected] = useState(PRESETS[0])
  const [customUrl, setCustomUrl] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const activeUrl = customUrl.trim() || selected.url

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Calendario</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Agenda una reunión de onboarding, soporte o demo con el equipo de Waitless.
        </p>
      </div>

      {/* Preset selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo de reunión</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.url}
              onClick={() => { setSelected(p); setCustomUrl(''); setShowCustom(false) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                selected.url === p.url && !customUrl
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(s => !s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 ${
              showCustom ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            URL personalizada
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showCustom && (
          <input
            type="url"
            placeholder="https://cal.com/..."
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            className="w-full h-11 bg-gray-100 rounded-xl px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
          />
        )}

        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir en nueva pestaña
        </a>
      </div>

      {/* Calendar iframe */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ height: 700 }}>
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">{customUrl || selected.label}</p>
        </div>
        <iframe
          key={activeUrl}
          src={activeUrl}
          className="w-full"
          style={{ height: 'calc(700px - 53px)', border: 'none' }}
          title="Calendario Waitless"
          allow="camera; microphone"
        />
      </div>
    </div>
  )
}
