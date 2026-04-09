import { Suspense } from 'react'
import { CompletarRegistroForm } from '@/components/registro/completar-registro-form'

export const metadata = {
  title: 'Configurá tu negocio — WAITLESS',
}

export default function CompletarRegistroPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-black">
        <div className="max-w-xs w-full">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-8">
            <span className="text-black font-black text-lg">W</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
            Último paso.
          </h1>
          <p className="text-white/50 text-sm mt-4 leading-relaxed">
            Configurá la identidad visual de tu negocio. Podés cambiarlo después desde el panel de configuración.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white font-black text-sm">W</span>
            </div>
            <span className="font-bold text-black text-lg" style={{ letterSpacing: '-0.02em' }}>WAITLESS</span>
          </div>
          <Suspense fallback={<div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-black/20 border-t-black rounded-full animate-spin" /></div>}>
            <CompletarRegistroForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
