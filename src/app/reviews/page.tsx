import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { getPublicContent } from '@/lib/content-service';

const tripadvisorEmbedUrl = process.env.NEXT_PUBLIC_TRIPADVISOR_WIDGET_URL;
const googleEmbedUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_WIDGET_URL;

export default async function ReviewsPage() {
  const { siteSettings, reviews } = await getPublicContent();
  const approvedReviews = reviews.filter((review) => review.status === 'approved');
  const heroImage = siteSettings.heroMediaUrl;

  return (
    <div>
      <section className="relative w-full h-[30vh] md:h-[40vh] bg-secondary">
        {heroImage && (
          <Image
            src={heroImage}
            alt={siteSettings.heroTitle}
            fill
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Traveler Stories</h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 font-body">
            Real stories from our adventurous community.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Tripadvisor Reviews</CardTitle>
                <CardDescription>Browse our verified Tripadvisor feedback.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {tripadvisorEmbedUrl ? (
                  <iframe
                    src={tripadvisorEmbedUrl}
                    title="Tripadvisor Reviews"
                    className="h-80 w-full rounded-md border"
                    loading="lazy"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tripadvisor embed not configured yet. Add NEXT_PUBLIC_TRIPADVISOR_WIDGET_URL to enable.
                  </p>
                )}
              </CardContent>
            </Card>

            {approvedReviews.map((review) => (
              <Card key={review.id} className="flex flex-col shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={`https://i.pravatar.cc/150?u=${review.authorDisplay}`} />
                        <AvatarFallback>{review.authorDisplay.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-body font-bold">{review.authorDisplay}</CardTitle>
                        <CardDescription className="text-xs">{review.country}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow text-sm text-muted-foreground">
                  <p>&quot;{review.message}&quot;</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                  {review.tourName && <Badge variant="outline">{review.tourName}</Badge>}
                  <span>{review.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </CardFooter>
              </Card>
            ))}

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Google Reviews</CardTitle>
                <CardDescription>Read what guests are saying on Google.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {googleEmbedUrl ? (
                  <iframe
                    src={googleEmbedUrl}
                    title="Google Reviews"
                    className="h-80 w-full rounded-md border"
                    loading="lazy"
                    allow="display-capture"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Google embed not configured yet. Add NEXT_PUBLIC_GOOGLE_REVIEWS_WIDGET_URL to enable.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
