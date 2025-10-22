import { getPublicContent } from '@/lib/content-service';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star } from 'lucide-react';
import ReviewsExplorer from '@/components/reviews-explorer';

const tripadvisorEmbedUrl = process.env.NEXT_PUBLIC_TRIPADVISOR_WIDGET_URL;
const googleEmbedUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_WIDGET_URL;

export default async function ReviewsPage() {
  const { siteSettings, reviews } = await getPublicContent();
  const approvedReviews = reviews.filter((review) => review.status === 'approved');
  const heroImage = siteSettings.heroMediaUrl;
  const totalReviews = approvedReviews.length;
  const averageRating = totalReviews
    ? approvedReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews
    : 0;
  const tourNames = Array.from(
    new Set(approvedReviews.map((review) => review.tourName).filter((name): name is string => Boolean(name)))
  ).sort();
  const serialisedReviews = approvedReviews.map((review) => ({
    id: review.id,
    authorDisplay: review.authorDisplay,
    country: review.country,
    rating: review.rating,
    message: review.message,
    tourName: review.tourName ?? null,
    createdAt: review.createdAt.toISOString(),
  }));

  return (
    <div className="bg-background">
      <section className="relative h-[40vh] min-h-[320px] overflow-hidden">
        {heroImage ? (
          <Image src={heroImage} alt={siteSettings.heroTitle} fill className="object-cover" sizes="100vw" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-4 text-center text-white">
          <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em]">
            Reviews & testimonials
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Traveller reviews</h1>
          <p className="max-w-2xl text-lg text-white/90">
            {totalReviews > 0
              ? `Rated ${averageRating.toFixed(1)} / 5 from ${totalReviews} verified guests.`
              : 'Be the first to share a review and guide future travellers.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <Star className="h-4 w-4 text-yellow-300" />
              Average {averageRating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              {tourNames.length} tour{tourNames.length === 1 ? '' : 's'} reviewed
            </span>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-8">
              <ReviewsExplorer reviews={serialisedReviews} tourNames={tourNames} />
            </div>
            <aside className="space-y-8">
              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-headline">Tripadvisor reviews</CardTitle>
                  <CardDescription>Browse our verified Tripadvisor feedback.</CardDescription>
                </CardHeader>
                <CardContent>
                  {tripadvisorEmbedUrl ? (
                    <iframe
                      src={tripadvisorEmbedUrl}
                      title="Tripadvisor Reviews"
                      className="h-80 w-full rounded-md border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>Tripadvisor embed not configured yet.</p>
                      <a href="https://www.tripadvisor.com" target="_blank" rel="noreferrer" className="text-primary underline">
                        Follow us on TripAdvisor
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-headline">Google reviews</CardTitle>
                  <CardDescription>Read what guests are saying on Google.</CardDescription>
                </CardHeader>
                <CardContent>
                  {googleEmbedUrl ? (
                    <iframe
                      src={googleEmbedUrl}
                      title="Google Reviews"
                      className="h-80 w-full rounded-md border"
                      loading="lazy"
                      allow="display-capture"
                    />
                  ) : (
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>Google embed not configured yet.</p>
                      <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-primary underline">
                        View our Google profile
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
