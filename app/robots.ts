import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://waitless.app').replace(/\/$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/registro', '/terms', '/privacy', '/cookies'],
        disallow: [
          '/api/',
          '/restaurante/',
          '/consumidor/',
          '/admin/',
          '/cocina/',
          '/mesero/',
          '/repartidor/',
          '/superadmin/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
