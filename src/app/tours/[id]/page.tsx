import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CalendarRange, MapPin, Users, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPublicContent } from '@/lib/content-service';
import { getFinishedTourComments } from '@/lib/finished-tour-comments';
import type { FinishedTourComment } from '@/lib/types';
import { FinishedTourCommentForm } from '@/components/finished-tour/comment-form';

interface TourPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: TourPageProps) {
  const { tours } = await getPublicContent();
  const tour = tours.find((item) => item.id === params.id && item.status === 'finished');
  if (!tour) return {};

  return {
    title: `${tour.name} — Finished Tour Diary`,
    description: tour.summary,
  };
}

export default async function FinishedTourPage({ params }: TourPageProps) {
  const { id } = params;
  const { tours, tourTypes } = await getPublicContent();
  const tour = tours.find((item) => item.id === id && item.status === 'finished');

  if (!tour) {
    notFound();
  }

  const comments = await getFinishedTourComments(tour.id);
  const ratingAggregate = comments.reduce(
    (acc, current) => {
      return {
        count: acc.count + 1,
        total: acc.total + current.rating,
      };
    },
    { count: 0, total: 0 }
  );
  const averageRating = ratingAggregate.count > 0 ? ratingAggregate.total / ratingAggregate.count : null;
  const start = tour.startDate instanceof Date ? tour.startDate : new Date(tour.startDate);
  const end = tour.endDate instanceof Date ? tour.endDate : new Date(tour.endDate);
  const tourTypeMap = new Map(tourTypes.map((type) => [type.id, type.title]));

  const formattedDateRange = `${start.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} – ${end.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <div className="pb-20">
      <section className="relative h-[40vh] w-full">
        {tour.photoUrls[0] && (
          <Image
            src={tour.photoUrls[0]}
            alt={tour.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-white/80">Finished tour diary</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-headline font-bold">{tour.name}</h1>
          <p className="mt-4 max-w-3xl text-base md:text-lg text-white/80">{tour.summary}</p>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="mt-12 grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-4 text-foreground/80 text-sm">
                  <span className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-accent" />
                    {formattedDateRange}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {tour.clientCity}, {tour.clientCountry}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    {tour.clientCount} travellers
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground/80 text-sm">Nationalities represented</h3>
                  <p>{tour.clientNationalities.join(', ') || 'Not recorded'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground/80 text-sm">Guide</h3>
                  <p>
                    {tour.guideName}
                  </p>
                  {tour.guideLanguages?.length ? (
                    <p className="text-sm text-muted-foreground">
                      Languages: {tour.guideLanguages.join(', ')}
                    </p>
                  ) : null}
                  {averageRating !== null && (
                    <p className="mt-1 flex flex-wrap gap-4 text-xs uppercase tracking-wide text-muted-foreground">
                      <span>Average rating {averageRating.toFixed(1)} / 5</span>
                      <span>{ratingAggregate.count} traveller {ratingAggregate.count === 1 ? 'review' : 'reviews'}</span>
                    </p>
                  )}
                </div>
                {tour.provinces?.length ? (
                  <div>
                    <h3 className="font-semibold text-foreground/80 text-sm">Provinces visited</h3>
                    <p>{tour.provinces.join(', ')}</p>
                  </div>
                ) : null}
                {tour.tourTypeIds && tour.tourTypeIds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground/80 text-sm">Tour styles</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tour.tourTypeIds.map((typeId) => (
                        <Badge key={typeId} variant="secondary">
                          {tourTypeMap.get(typeId) ?? 'Experience'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Itinerary notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {tour.itinerary}
                </div>
              </CardContent>
            </Card>

            {(tour.photoUrls.length > 1 || tour.videoUrls.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-headline">Media keepsakes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {tour.photoUrls.length > 1 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {tour.photoUrls.slice(1).map((url) => (
                        <div key={url} className="relative h-48 w-full overflow-hidden rounded-md">
                          <Image src={url} alt="Tour photo" fill className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
                        </div>
                      ))}
                    </div>
                  )}
                  {tour.videoUrls.length > 0 && (
                    <div className="space-y-4">
                      {tour.videoUrls.map((url) => (
                        <video key={url} controls className="w-full rounded-md bg-black">
                          <source src={url} />
                          <track kind="captions" />
                        </video>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Guide feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FinishedTourCommentForm tourId={tour.id} />
                <div className="space-y-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No guide feedback yet. Be the first to share your experience.</p>
                  )}
                  {comments.map((comment) => (
                    <CommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-accent" />
                  <span>{formattedDateRange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span>{tour.clientCity}, {tour.clientCountry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span>{tour.clientCount} guests</span>
                </div>
            {averageRating !== null && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-accent" />
                <span>Avg guide rating {averageRating.toFixed(1)} ({ratingAggregate.count})</span>
              </div>
            )}
              </CardContent>
            </Card>

            {tour.photoUrls[0] && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-headline">Cover moment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-56 w-full overflow-hidden rounded-md">
                    <Image src={tour.photoUrls[0]} alt="Cover" fill className="object-cover" sizes="100vw" />
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

interface CommentCardProps {
  comment: FinishedTourComment;
}

function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">{comment.authorName}</span>
        <span className="text-muted-foreground">{comment.createdAt.toLocaleDateString()}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-foreground/80">
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        <span>{comment.rating.toFixed(1)} / 5</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{comment.message}</p>
    </div>
  );
}
