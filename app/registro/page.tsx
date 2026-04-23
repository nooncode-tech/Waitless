import { RegistroForm } from '@/components/registro/registro-form'
import Link from 'next/link'

export const metadata = {
  title: 'Registrar mi negocio — WAITLESS',
  description: 'Creá tu plataforma de gestión para restaurante en minutos.',
}

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-white flex relative">
      <Link
        href="/"
        className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-black transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Inicio
      </Link>
      {/* Left panel — value prop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-black">
        <div className="max-w-xs w-full">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-8">
            <span className="text-black font-black text-lg">W</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
            Tu restaurante,<br />tu plataforma.
          </h1>
          <p className="text-white/50 text-sm mt-4 leading-relaxed">
            Gestioná pedidos, mesas, cocina y pagos desde un solo lugar. Personalizado con tu marca.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: '🎨', text: 'Logo, colores y nombre propios' },
              { icon: '📱', text: 'Menú digital con QR por mesa' },
              { icon: '👨‍🍳', text: 'Sistema para cocina y meseros' },
              { icon: '💳', text: 'Cierre de caja y reportes' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-white/60 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white font-black text-sm">W</span>
            </div>
            <span className="font-bold text-black text-lg" style={{ letterSpacing: '-0.02em' }}>WAITLESS</span>
          </div>

          <RegistroForm />

          <p className="mt-8 text-center text-xs text-[#BEBEBE]">
            ¿Ya tenés cuenta?{' '}
            <Link href="/" className="text-black font-semibold underline underline-offset-2 hover:text-black/70 transition-colors">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
