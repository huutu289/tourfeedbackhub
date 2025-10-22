import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getPublicContent } from '@/lib/content-service';

export default async function TourTypesPage() {
  const { tourTypes, tours } = await getPublicContent();
  const toursByType = new Map<string, string[]>(
    tourTypes.map((type) => [
      type.id,
      tours
        .filter((tour) => tour.tourTypeIds?.includes(type.id))
        .map((tour) => tour.name),
    ])
  );

  return (
    <div className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-border/60 bg-secondary/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Tailored experiences
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-headline font-bold">Choose your travel personality</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Each tour style combines boutique stays, curated dining, and insider access. Start with your travel persona and discover three hand-picked journeys to match.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tourTypes.map((tourType) => (
            <Card key={tourType.id} className="flex h-full flex-col border-border/60 bg-background/80 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-lg">
                    {tourType.icon ?? '✨'}
                  </Badge>
                  <CardTitle className="text-xl font-headline">{tourType.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{tourType.description}</p>
                {toursByType.get(tourType.id)?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Signature journeys</p>
                    <ul className="space-y-1 text-sm text-foreground/80">
                      {toursByType
                        .get(tourType.id)!
                        .slice(0, 4)
                        .map((name) => (
                          <li key={name}>• {name}</li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button asChild variant="ghost" className="px-0">
                  <Link href={`/tours?style=${tourType.id}`} className="flex items-center gap-2">
                    View tours
                    <span aria-hidden>&rarr;</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
