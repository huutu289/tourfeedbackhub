import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TourCard from '@/components/tour-card';
import { getPublicContent } from '@/lib/content-service';

export default async function ToursPage() {
  const { tours, tourTypes } = await getPublicContent();
  const tourTypeMap = new Map(tourTypes.map((type) => [type.id, type.title]));

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Signature Journeys</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Teaser itineraries curated from our most-loved bespoke experiences. Request the full program to tailor it your way.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>

        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-headline font-semibold">What to expect</h2>
          {tours.map((tour) => (
            <Card key={`${tour.id}-details`} className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl font-headline">{tour.name}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{tour.durationLabel}</Badge>
                  <Badge variant="outline">From ${tour.priceFrom}</Badge>
                  {tour.tourTypeIds?.map((typeId) => (
                    <Badge key={typeId} variant="secondary">
                      {tourTypeMap.get(typeId) ?? 'Experience'}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{tour.summary}</p>
                {tour.highlights && tour.highlights.length > 0 && (
                  <ul className="mt-4 list-disc pl-5 space-y-1 text-sm text-foreground/80">
                    {tour.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
