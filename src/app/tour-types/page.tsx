import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Tour Styles</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Each journey blends boutique stays, curated dining, and cultural immersion tailored to your pace.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tourTypes.map((tourType) => (
            <Card key={tourType.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{tourType.icon ?? '✨'}</Badge>
                  <CardTitle className="text-xl font-headline">{tourType.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">{tourType.description}</p>
                {toursByType.get(tourType.id)?.length ? (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Signature journeys</p>
                    <ul className="space-y-1 text-sm text-foreground/80">
                      {toursByType.get(tourType.id)!.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
