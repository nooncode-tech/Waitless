import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de privacidad — Waitless',
  description: 'Cómo Waitless recopila, usa y protege tu información personal.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-block">← Volver</Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
          Política de privacidad
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: Mayo 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-600">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <p><strong className="text-gray-800">Restaurantes (B2B):</strong> Nombre del negocio, datos de contacto del administrador, información de facturación, menú y configuración operativa, registros de transacciones y auditoría.</p>
            <p className="mt-2"><strong className="text-gray-800">Consumidores:</strong> Nombre, email, dirección de entrega, historial de pedidos, saldo del wallet y transacciones. Opcional: número de teléfono.</p>
            <p className="mt-2"><strong className="text-gray-800">Datos técnicos:</strong> Dirección IP, tipo de dispositivo, navegador, páginas visitadas y duración de sesión, mediante cookies y registros del servidor.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Cómo usamos tu información</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Proveer y mejorar el Servicio</li>
              <li>Procesar pagos y gestionar el wallet</li>
              <li>Enviar notificaciones sobre pedidos y cuenta</li>
              <li>Detectar y prevenir fraude</li>
              <li>Cumplir con obligaciones legales y regulatorias</li>
              <li>Generar estadísticas agregadas y anónimas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Compartición de datos</h2>
            <p>No vendemos datos personales a terceros. Compartimos datos únicamente con:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong className="text-gray-800">Stripe:</strong> procesamiento de pagos y verificación KYC de restaurantes</li>
              <li><strong className="text-gray-800">Supabase:</strong> almacenamiento de datos (infraestructura)</li>
              <li><strong className="text-gray-800">Vercel:</strong> hosting y CDN</li>
              <li><strong className="text-gray-800">Resend:</strong> envío de emails transaccionales</li>
              <li><strong className="text-gray-800">Restaurante:</strong> el restaurante ve los datos del pedido del consumidor (nombre, dirección, items) para procesar el pedido</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Seguridad</h2>
            <p>Utilizamos cifrado TLS en tránsito y en reposo. Las contraseñas se almacenan con hashing seguro. El acceso a datos de producción está restringido y auditado. Realizamos backups automáticos diarios.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Retención de datos</h2>
            <p>Los datos de consumidores activos se retienen mientras la cuenta esté activa. Al eliminar la cuenta, los datos se borran en 30 días, excepto los registros de transacciones que se retienen 12 meses por obligación fiscal.</p>
            <p className="mt-2">Los datos de restaurantes cancelados se retienen según la política descrita en los Términos de Servicio (30 días acceso + 6 meses archivo + eliminación).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Tus derechos</h2>
            <p>Tenés derecho a:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>Acceder a los datos que tenemos sobre vos</li>
              <li>Corregir datos incorrectos</li>
              <li>Solicitar la eliminación de tu cuenta y datos</li>
              <li>Portabilidad de datos (exportar en formato JSON/CSV)</li>
              <li>Oponerte al procesamiento de tus datos para marketing</li>
            </ul>
            <p className="mt-2">Para ejercer estos derechos: <a href="mailto:privacidad@waitless.app" className="text-[#06C167] hover:underline">privacidad@waitless.app</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p>Usamos cookies esenciales para el funcionamiento del Servicio y cookies analíticas opcionales. Ver nuestra <Link href="/cookies" className="text-[#06C167] hover:underline">Política de cookies</Link> para más detalles.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Menores de edad</h2>
            <p>El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor ha creado una cuenta, la eliminaremos inmediatamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Cambios a esta política</h2>
            <p>Notificaremos cambios materiales a esta política por email con al menos 15 días de anticipación.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contacto</h2>
            <p><a href="mailto:privacidad@waitless.app" className="text-[#06C167] hover:underline">privacidad@waitless.app</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-700">Términos de servicio</Link>
          <Link href="/cookies" className="hover:text-gray-700">Política de cookies</Link>
        </div>
      </div>
    </main>
  )
}
