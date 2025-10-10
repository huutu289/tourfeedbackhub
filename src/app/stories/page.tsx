import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicContent } from '@/lib/content-service';

export default async function StoriesPage() {
  const { stories } = await getPublicContent();

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Stories from the Road</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Travel notes, partner spotlights, and highlights from bespoke journeys across Vietnam.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <Card key={story.id} className="overflow-hidden">
              {story.coverImageUrl && (
                <div className="relative h-48 w-full">
                  <Image src={story.coverImageUrl} alt={story.title} fill className="object-cover" sizes="(min-width:768px) 33vw, 100vw" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl font-headline">{story.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{story.excerpt}</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                  {story.publishedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {story.readTimeMinutes && (
                  <p className="text-xs text-muted-foreground">{story.readTimeMinutes} min read</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
