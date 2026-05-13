import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <Compass className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-5xl font-black text-gray-900 mb-2">404</p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
