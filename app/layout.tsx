import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { OfflineIndicator } from '@/components/shared/offline-indicator'
import { loadBrandingFromRequest } from '@/lib/tenant-server'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadBrandingFromRequest()
  const name = branding.restaurantName
  const appleTitle = name.slice(0, 20)

  return {
    title: name,
    description: 'Sistema de gestión de mesa, pedido, cocina y cobro para restaurantes con servicio en mesa.',
    generator: 'waitless.app',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: appleTitle,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await loadBrandingFromRequest()
  return {
    themeColor: branding.primaryColor,
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const branding = await loadBrandingFromRequest()

  // CSS vars inyectadas server-side para evitar FOUC de colores del tenant
  const cssVars = {
    '--color-primary': branding.primaryColor,
    '--color-secondary': branding.secondaryColor,
    '--color-accent': branding.accentColor,
    '--font-family': branding.fontFamily,
  } as React.CSSProperties

  return (
    <html lang="es" style={cssVars}>
      <body className="antialiased bg-background text-foreground">
        <a href="#main-content" className="skip-to-content">
          Ir al contenido principal
        </a>
        <div id="main-content">
          {children}
        </div>
        <OfflineIndicator />
        <Analytics />

        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
      </body>
    </html>
  )
}
