import type { MetadataRoute } from 'next';
import { getPublicContent } from '@/lib/content-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { tours, stories } = await getPublicContent();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const staticRoutes = ['/', '/about', '/tour-types', '/tours', '/stories', '/reviews', '/feedback', '/contact'];

  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const storyEntries = stories.map((story) => ({
    url: `${baseUrl}/stories`,
    lastModified: story.publishedAt,
  }));

  const tourEntries = tours.map((tour) => ({
    url: `${baseUrl}/tours`,
    lastModified: new Date(),
  }));

  return [...routes, ...storyEntries, ...tourEntries];
}
