import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Star, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TourCard from '@/components/tour-card';
import { getPublicContent } from '@/lib/content-service';

export default async function Home() {
  const { siteSettings, tours, reviews, tourTypes, stories } = await getPublicContent();
  const approvedReviews = reviews.filter((review) => review.status === 'approved').slice(0, 3);
  const heroImage = siteSettings.heroMediaUrl;
  const featuredStory = stories.at(0);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[60vh] md:h-[80vh]">
        {heroImage && (
          <Image
            src={heroImage}
            alt={siteSettings.heroTitle}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold !leading-tight max-w-4xl">
            {siteSettings.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 font-body">
            {siteSettings.heroSubtitle}
          </p>
          <Button asChild size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/feedback">
              {siteSettings.heroCtaLabel} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-bold">{siteSettings.aboutTitle}</h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                {siteSettings.aboutDescription}
              </p>
              {siteSettings.values && siteSettings.values.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {siteSettings.values.map((value) => (
                    <div key={value} className="flex items-start gap-3 rounded-lg border bg-card/30 p-4">
                      <Compass className="h-5 w-5 text-accent shrink-0 mt-1" />
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href="/about">Discover the story</Link>
                </Button>
              </div>
            </div>
            {featuredStory && (
              <Card className="overflow-hidden shadow-lg">
                {featuredStory.coverImageUrl && (
                  <div className="relative h-60 w-full">
                    <Image
                      src={featuredStory.coverImageUrl}
                      alt={featuredStory.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 40vw, 100vw"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">{featuredStory.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{featuredStory.excerpt}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost" className="px-0">
                    <Link href="/stories">Read more stories</Link>
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-secondary/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">Tour Styles</h2>
          <p className="mt-4 text-center max-w-2xl mx-auto text-muted-foreground">
            Each journey blends boutique stays, curated dining, and cultural immersion tailored to your pace.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tourTypes.map((tourType) => (
              <Card key={tourType.id} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tourType.icon ?? '✨'}</Badge>
                    <CardTitle className="font-headline text-xl">{tourType.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tourType.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="tours" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">Popular Tours</h2>
          <p className="mt-4 text-center max-w-2xl mx-auto text-muted-foreground">
            Explore traveller favourites curated from heartfelt feedback.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tours.slice(0, 3).map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">What Our Travelers Say</h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {approvedReviews.map((review) => (
              <Card key={review.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${review.authorDisplay}`} />
                      <AvatarFallback>{review.authorDisplay.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-body text-lg font-bold">{review.authorDisplay}</CardTitle>
                      <p className="text-sm text-muted-foreground">{review.country}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">&quot;{review.message}&quot;</p>
                </CardContent>
                <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                  {review.tourName && <Badge variant="secondary">{review.tourName}</Badge>}
                  <span>{review.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild variant="outline">
              <Link href="/reviews">
                Read More Reviews <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center py-16 md:py-24">
            <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg">
              {heroImage && (
                <Image src={heroImage} alt={siteSettings.heroTitle} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
              )}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Your Voice Matters</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Every piece of feedback is a stepping stone to a better experience. Your reviews help us refine our tours and guide future travellers.
              </p>
              <Button asChild size="lg" className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/feedback">Share Your Experience</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
