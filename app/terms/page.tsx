import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de servicio — Waitless',
  description: 'Términos y condiciones de uso de la plataforma Waitless.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-block">← Volver</Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
          Términos de servicio
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: Mayo 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-600">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Aceptación de los términos</h2>
            <p>Al acceder o usar la plataforma Waitless (&ldquo;el Servicio&rdquo;), usted acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al Servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Descripción del servicio</h2>
            <p>Waitless es una plataforma operativa white-label para restaurantes que incluye sistema de pedidos en mesa por QR, panel de cocina (KDS), módulo de delivery, wallet digital del consumidor y herramientas de gestión y reportes.</p>
            <p className="mt-2">El restaurante contrata el Servicio en modalidad SaaS (Software como Servicio) mediante suscripción mensual. El consumidor final accede al marketplace y wallet de forma gratuita.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Cuentas y acceso</h2>
            <p>Cada restaurante debe designar un administrador responsable de la cuenta. El administrador es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades que ocurran bajo su cuenta.</p>
            <p className="mt-2">Waitless se reserva el derecho de suspender o cancelar cuentas que violen estos términos, realicen actividades fraudulentas o incumplan los pagos de suscripción.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Suscripción y pagos</h2>
            <p>Los planes de suscripción se cobran mensualmente en USD. El período de prueba gratuito de 7 días incluye la creación de un método de pago válido. Al finalizar el período de prueba, se realizará el cobro automático según el plan seleccionado.</p>
            <p className="mt-2">Las cancelaciones deben realizarse antes del próximo ciclo de facturación. No se realizan reembolsos por períodos parciales.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Wallet del consumidor</h2>
            <p>El saldo del wallet es un crédito prepago que no genera intereses. El saldo en efectivo (cash) no tiene vencimiento. El saldo de recompensas vence a los 3 meses desde su otorgamiento.</p>
            <p className="mt-2">Los reembolsos del saldo cash están disponibles a solicitud del usuario con una comisión del 5% para cubrir costos de procesamiento. El saldo de recompensas no es reembolsable.</p>
            <p className="mt-2">Waitless actúa como emisor de crédito prepago. El saldo del wallet no constituye un depósito bancario ni está cubierto por ningún seguro de depósito.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Delivery y repartidores</h2>
            <p>Los repartidores son empleados o contratistas del restaurante, no de Waitless. El restaurante es responsable de su contratación, capacitación, seguro y cumplimiento laboral. Waitless proporciona únicamente la herramienta tecnológica de coordinación.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Comisiones del marketplace</h2>
            <p>Los pedidos generados a través del marketplace Waitless están sujetos a una comisión del 5% sobre el valor del pedido. Los pedidos realizados directamente (QR en mesa, acceso directo al restaurante) no están sujetos a comisión.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Mediación de disputas</h2>
            <p>Waitless actúa como mediador en disputas entre consumidores y restaurantes. El proceso de mediación tiene un plazo máximo de 48 horas. Las decisiones de Waitless son definitivas en el contexto de la plataforma y no implican arbitraje legal vinculante.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Propiedad intelectual</h2>
            <p>El Servicio y su contenido original son propiedad de Waitless y están protegidos por leyes de propiedad intelectual. Los restaurantes conservan la propiedad de su menú, marca e imágenes cargadas en la plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Limitación de responsabilidad</h2>
            <p>Waitless no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio. La responsabilidad total de Waitless no excederá el monto pagado por el usuario en los 3 meses anteriores al incidente.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Retención de datos</h2>
            <p>Al cancelar la suscripción, el restaurante tiene 30 días de acceso completo a sus datos. Después, los datos se archivan en solo lectura por 6 meses. Pasado ese período, los datos se eliminan permanentemente. Los registros de auditoría se retienen por 12 meses por separado.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Modificaciones</h2>
            <p>Waitless se reserva el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados con al menos 15 días de anticipación ante cambios materiales. El uso continuado del Servicio después de los cambios constituye aceptación de los nuevos términos.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">13. Contacto</h2>
            <p>Para consultas sobre estos términos: <a href="mailto:legal@waitless.app" className="text-[#06C167] hover:underline">legal@waitless.app</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-gray-700">Política de privacidad</Link>
          <Link href="/cookies" className="hover:text-gray-700">Política de cookies</Link>
        </div>
      </div>
    </main>
  )
}
