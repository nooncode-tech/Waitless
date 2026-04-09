/**
 * app/manifest.ts — Genera el manifest.webmanifest dinámicamente desde app_config del tenant.
 * Next.js 14+ sirve esto como /manifest.webmanifest automáticamente.
 * Usa loadBrandingFromRequest() para resolver el tenant correcto desde el host del request.
 */

import type { MetadataRoute } from 'next'
import { loadBrandingFromRequest } from '@/lib/tenant-server'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await loadBrandingFromRequest()
  const name = branding.restaurantName
  const shortName = name.slice(0, 12)
  const themeColor = branding.primaryColor
  const backgroundColor = '#ffffff'

  return {
    name,
    short_name: shortName,
    description: 'Sistema de gestión de mesa, pedido, cocina y cobro para restaurantes con servicio en mesa.',
    start_url: '/',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    orientation: 'any',
    categories: ['food', 'productivity', 'business'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    lang: 'es',
  }
}
