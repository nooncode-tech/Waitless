import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de cookies — Waitless',
  description: 'Información sobre el uso de cookies en la plataforma Waitless.',
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-block">← Volver</Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
          Política de cookies
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: Mayo 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-600">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">¿Qué son las cookies?</h2>
            <p>Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo cuando los visitás. Se usan para recordar preferencias, mantener sesiones activas y recopilar estadísticas de uso.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cookies que usamos</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Esencial</span>
                  <p className="font-semibold text-gray-900 text-sm">Sesión y autenticación</p>
                </div>
                <p className="text-sm">Mantienen tu sesión activa al iniciar sesión como staff o consumidor. Sin estas cookies, el Servicio no puede funcionar.</p>
                <p className="text-xs text-gray-400 mt-1.5">Proveedor: Supabase Auth · Duración: hasta cierre de sesión o 7 días</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Esencial</span>
                  <p className="font-semibold text-gray-900 text-sm">Preferencias del sitio</p>
                </div>
                <p className="text-sm">Guardan configuraciones como idioma y preferencias de visualización.</p>
                <p className="text-xs text-gray-400 mt-1.5">Duración: 1 año</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Analítica</span>
                  <p className="font-semibold text-gray-900 text-sm">Vercel Analytics</p>
                </div>
                <p className="text-sm">Recopilamos estadísticas de uso anónimas y agregadas (páginas visitadas, tiempo en el sitio, errores) para mejorar el Servicio. No se cruzan con datos personales.</p>
                <p className="text-xs text-gray-400 mt-1.5">Proveedor: Vercel Inc. · Datos: anónimos y agregados · Duración: 30 días</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Analítica</span>
                  <p className="font-semibold text-gray-900 text-sm">Sentry (monitoreo de errores)</p>
                </div>
                <p className="text-sm">Captura errores técnicos para ayudarnos a diagnosticar y corregir problemas. Incluye información sobre el dispositivo y el error, no sobre el usuario.</p>
                <p className="text-xs text-gray-400 mt-1.5">Proveedor: Sentry Inc. · Duración: sesión</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cookies de terceros</h2>
            <p>Al usar el módulo de pagos, Stripe puede establecer cookies propias en su dominio para prevención de fraude y cumplimiento PCI. Consultá la <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#06C167] hover:underline">política de privacidad de Stripe</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cómo controlar las cookies</h2>
            <p>Podés controlar las cookies desde la configuración de tu navegador:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#06C167] hover:underline">Chrome</a></li>
              <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-[#06C167] hover:underline">Firefox</a></li>
              <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#06C167] hover:underline">Safari</a></li>
            </ul>
            <p className="mt-2">Tené en cuenta que deshabilitar cookies esenciales puede impedir el correcto funcionamiento del Servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Contacto</h2>
            <p><a href="mailto:privacidad@waitless.app" className="text-[#06C167] hover:underline">privacidad@waitless.app</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-700">Términos de servicio</Link>
          <Link href="/privacy" className="hover:text-gray-700">Política de privacidad</Link>
        </div>
      </div>
    </main>
  )
}
