import { getPublicContent } from '@/lib/content-service';
import StoriesExplorer from '@/components/stories-explorer';

export default async function StoriesPage() {
  const { stories } = await getPublicContent();
  const serialisedStories = stories.map((story) => ({
    id: story.id,
    title: story.title,
    excerpt: story.excerpt,
    coverImageUrl: story.coverImageUrl,
    publishedAt: story.publishedAt.toISOString(),
    readTimeMinutes: story.readTimeMinutes ?? null,
    tags: story.tags ?? [],
    category: story.category ?? null,
  }));

  return (
    <div className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-border/60 bg-secondary/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Stories & diaries
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-headline font-bold">Stories from the road</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Filter by theme or travel month to discover on-the-ground notes from guides, guests, and partners across Vietnam.
          </p>
        </div>

        <div className="mt-12">
          <StoriesExplorer stories={serialisedStories} />
        </div>
      </div>
    </div>
  );
}
