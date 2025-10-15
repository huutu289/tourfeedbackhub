import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TourCard from '@/components/tour-card';
import { getPublicContent } from '@/lib/content-service';

export default async function ToursPage() {
  const { tours, tourTypes } = await getPublicContent();
  const finishedTours = tours.filter((tour) => tour.status === 'finished');
  const tourTypeMap = new Map(tourTypes.map((type) => [type.id, type.title]));

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Finished Tour Diaries</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Browse recent bespoke journeys, discover day-by-day highlights, and see how travellers rated their guide.
          </p>
        </div>

        {finishedTours.length > 0 ? (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {finishedTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-muted-foreground">
            Completed journeys will appear here once published by the team.
          </p>
        )}

        {finishedTours.length > 0 && (
          <div className="mt-16 space-y-6">
            <h2 className="text-2xl font-headline font-semibold">Diary snapshots</h2>
            {finishedTours.map((tour) => (
              <Card key={`${tour.id}-details`} className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-xl font-headline">{tour.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge variant="outline">{tour.code}</Badge>
                    <Badge variant="outline">
                      {tour.startDate.toLocaleDateString()} – {tour.endDate.toLocaleDateString()}
                    </Badge>
                    <Badge variant="outline">{tour.clientCount} guests</Badge>
                    <Badge variant="secondary">Guide {tour.guideName}</Badge>
                    {tour.tourTypeIds?.map((typeId) => (
                      <Badge key={typeId} variant="outline">
                        {tourTypeMap.get(typeId) ?? 'Experience'}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">{tour.summary}</p>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/80">Traveller nationalities</h3>
                    <p className="text-sm text-muted-foreground">
                      {tour.clientNationalities.join(', ') || 'Not recorded'}
                    </p>
                  </div>
                  {tour.provinces?.length ? (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground/80">Provinces visited</h3>
                      <p className="text-sm text-muted-foreground">{tour.provinces.join(', ')}</p>
                    </div>
                  ) : null}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/80">Guide feedback</h3>
                    <p className="text-sm text-muted-foreground">
                      {tour.guideLanguages?.length
                        ? `Guide ${tour.guideName} leads in ${tour.guideLanguages.join(', ')}. Travellers rate the guide after each journey — open the diary to read their comments.`
                        : 'Travellers rate the guide after each journey — open the diary to read their comments.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/80">Itinerary</h3>
                    <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                      {tour.itinerary}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
