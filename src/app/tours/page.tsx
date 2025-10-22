import { getPublicContent } from '@/lib/content-service';
import ToursExplorer from '@/components/tours-explorer';

export default async function ToursPage() {
  const { tours, tourTypes, reviews } = await getPublicContent();
  const finishedTours = tours.filter((tour) => tour.status === 'finished');

  const ratingTotals = new Map<string, { total: number; count: number }>();
  reviews
    .filter((review) => review.status === 'approved' && review.tourId)
    .forEach((review) => {
      if (!review.tourId) return;
      const current = ratingTotals.get(review.tourId) ?? { total: 0, count: 0 };
      ratingTotals.set(review.tourId, {
        total: current.total + review.rating,
        count: current.count + 1,
      });
    });

  const serialisedTours = finishedTours.map((tour) => {
    const rating = ratingTotals.get(tour.id);
    const start = tour.startDate instanceof Date ? tour.startDate : new Date(tour.startDate);
    const end = tour.endDate instanceof Date ? tour.endDate : new Date(tour.endDate);
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return {
      id: tour.id,
      name: tour.name,
      summary: tour.summary,
      code: tour.code,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      clientCity: tour.clientCity,
      clientCountry: tour.clientCountry,
      clientCount: tour.clientCount,
      clientNationalities: tour.clientNationalities,
      durationDays,
      photoUrl: tour.photoUrls?.[0] ?? null,
      tourTypeIds: tour.tourTypeIds ?? [],
      provinces: tour.provinces ?? [],
      guideName: tour.guideName,
      guideLanguages: tour.guideLanguages ?? [],
      itinerary: tour.itinerary,
      rating: rating && rating.count > 0
        ? { average: rating.total / rating.count, count: rating.count }
        : null,
    };
  });

  const serialisedTourTypes = tourTypes.map((type) => ({
    id: type.id,
    title: type.title,
    icon: type.icon,
  }));

  return (
    <div className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-border/60 bg-secondary/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Finished diaries
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-headline font-bold">Explore recent bespoke tours</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Filter by style, travel dates, and region to uncover the journeys our guides recently completed across Vietnam.
          </p>
        </div>

        <div className="mt-12">
          <ToursExplorer tours={serialisedTours} tourTypes={serialisedTourTypes} />
        </div>
      </div>
    </div>
  );
}
