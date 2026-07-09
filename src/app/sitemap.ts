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
    { url: 'https://no-kings.world',          lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: 'https://no-kings.world/twin',     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: 'https://no-kings.world/world',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: 'https://no-kings.world/identity', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...questionPages,
  ]
}
