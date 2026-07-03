import { MetadataRoute } from 'next'
import { AGENDA } from '@/data/agenda'

export default function sitemap(): MetadataRoute.Sitemap {
  const questionPages: MetadataRoute.Sitemap = AGENDA.map(item => ({
    url: `https://no-kings.world/question/${item.id}`,
    lastModified: new Date(item.addedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: 'https://no-kings.world',            lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: 'https://no-kings.world/training',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://no-kings.world/twin',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: 'https://no-kings.world/network',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: 'https://no-kings.world/about',      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://no-kings.world/compare',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: 'https://no-kings.world/identity',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://no-kings.world/history',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.5 },
    { url: 'https://no-kings.world/politicians',lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://no-kings.world/insights',   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: 'https://no-kings.world/trust',      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...questionPages,
  ]
}
