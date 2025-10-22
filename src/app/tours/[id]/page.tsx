import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CalendarRange, MapPin, Users, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPublicContent } from '@/lib/content-service';
import { getFinishedTourComments } from '@/lib/finished-tour-comments';
import type { FinishedTourComment } from '@/lib/types';
import { FinishedTourCommentForm } from '@/components/finished-tour/comment-form';
import { MediaCarousel } from '@/components/finished-tour/media-carousel';

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

  const galleryPhotos = tour.photoUrls;

  return (
    <div className="pb-20 bg-gradient-to-b from-background via-background/80 to-muted/40">
      <section className="relative flex flex-col overflow-hidden bg-background md:flex-row">
        <div className="relative h-[22rem] w-full overflow-hidden md:h-[26rem] md:flex-1">
          {tour.photoUrls[0] && (
            <Image
              src={tour.photoUrls[0]}
              alt={tour.name}
              fill
              priority
              className="object-cover"
              sizes="60vw"
            />
          )}
        </div>
        <div className="relative flex min-h-[22rem] w-full flex-1 items-center justify-center overflow-hidden bg-gradient-to-r from-black/85 via-black/70 to-black/60 px-4 py-16 text-center text-white">
          <div className="absolute inset-0 opacity-20">
            {tour.photoUrls[0] && (
              <Image
                src={tour.photoUrls[0]}
                alt=""
                fill
                priority
                className="object-cover blur-sm"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/60 to-black/40" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-4">
            <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-white/70">Finished tour diary</p>
            <h1 className="text-3xl md:text-5xl font-headline font-bold">{tour.name}</h1>
            <p className="text-sm md:text-lg text-white/80">{tour.summary}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="mt-12 grid gap-10 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-headline">Highlights</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 text-sm text-muted-foreground lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-foreground/80 text-sm">
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
                    <h3 className="font-semibold text-foreground/80 text-sm">Tour styles</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tour.tourTypeIds?.length ? (
                        tour.tourTypeIds.map((typeId) => (
                          <Badge key={typeId} variant="secondary">
                            {tourTypeMap.get(typeId) ?? 'Experience'}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Curated private journey</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground/80 text-sm">Lead guide</h3>
                    <p className="text-foreground">{tour.guideName}</p>
                    {tour.guideLanguages?.length ? (
                      <p className="text-sm text-muted-foreground">
                        Languages: {tour.guideLanguages.join(', ')}
                      </p>
                    ) : null}
                    {averageRating !== null && (
                      <p className="mt-2 flex flex-wrap gap-4 text-xs uppercase tracking-wide text-muted-foreground">
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
                </div>
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

            {(galleryPhotos.length > 0 || tour.videoUrls.length > 0) && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-headline">Media keepsakes</CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaCarousel photos={galleryPhotos} videos={tour.videoUrls} />
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
            <Card className="shadow-lg">
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
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-headline">Cover moment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
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
