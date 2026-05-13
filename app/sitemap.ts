import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://waitless.app').replace(/\/$/, '')

  return [
    { url: base,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1   },
    { url: `${base}/explore`,            lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/registro`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/consumidor`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/terms`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/cookies`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ]
}
