import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Star, Compass, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TourCard from '@/components/tour-card';
import { getPublicContent } from '@/lib/content-service';
import HeroCarousel from '@/components/hero-carousel';

export default async function Home() {
  const { siteSettings, tours, reviews, tourTypes, stories, slides, posts } = await getPublicContent();
  const finishedTours = tours.filter((tour) => tour.status === 'finished');
  const sortedDiaries = [...finishedTours].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  );
  const recentDiaries = sortedDiaries.slice(0, 3);
  const approvedReviews = reviews.filter((review) => review.status === 'approved').slice(0, 3);
  const defaultLocale = (siteSettings.defaultLanguage ?? 'en').toLowerCase();
  const slidesForLocale = slides.filter((slide) => slide.locale.toLowerCase() === defaultLocale);
  const heroSlides = slidesForLocale.length ? slidesForLocale : slides;
  const primarySlide = heroSlides[0];
  const heroImage = primarySlide?.imageUrl ?? siteSettings.heroMediaUrl;
  const sortedStories = [...stories].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
  const [featuredStory, ...remainingStories] = sortedStories;
  const recentStories = (remainingStories.length ? remainingStories : sortedStories).slice(0, 3);
  const recentPosts = posts
    .filter((post) => post.status === 'published' && post.type === 'post')
    .slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroCarousel slides={heroSlides} />

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
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">Latest Tour Diaries</h2>
          <p className="mt-4 text-center max-w-2xl mx-auto text-muted-foreground">
            Explore freshly wrapped journeys, see where guests ventured, and open the diary for day-by-day highlights.
          </p>
          {recentDiaries.length > 0 ? (
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {recentDiaries.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">
              Finished journey highlights will appear here once published.
            </p>
          )}
          {recentDiaries.length > 0 && (
            <div className="mt-12 text-center">
              <Button asChild variant="outline">
                <Link href="/tours">
                  View all diaries <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {recentStories.length > 0 && (
        <section id="stories" className="py-16 md:py-24 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Latest Stories</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Narrative snapshots from guides and travellers, curated to inspire the next journey.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {recentStories.map((story) => {
                const storyDate = format(story.publishedAt, 'MMM d, yyyy');
                return (
                  <Card key={story.id} className="flex h-full flex-col overflow-hidden">
                    {story.coverImageUrl && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={story.coverImageUrl}
                          alt={story.title}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{storyDate}</span>
                        {typeof story.readTimeMinutes === 'number' && story.readTimeMinutes > 0 && (
                          <span>{story.readTimeMinutes} min read</span>
                        )}
                      </div>
                      <CardTitle className="mt-2 text-2xl font-headline leading-tight">{story.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground leading-relaxed">{story.excerpt}</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="ghost" className="px-0 text-sm">
                        <Link href="/stories" className="flex items-center gap-2">
                          Read the story
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="outline">
                <Link href="/stories">
                  Explore stories <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {recentPosts.length > 0 && (
        <section id="blog" className="py-16 md:py-24 bg-secondary/40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Latest from the Blog</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Fresh stories and planning tips from the team and our travellers.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((post) => {
                const postDate = post.publishedAt ?? post.updatedAt ?? post.createdAt;
                const formattedDate = postDate ? format(postDate, 'MMM d, yyyy') : '';
                const imageUrl = post.featuredImage?.url;
                return (
                  <Card key={post.id} className="flex h-full flex-col overflow-hidden">
                    {imageUrl && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formattedDate}</span>
                        <span>{post.authorName ?? 'Unknown'}</span>
                      </div>
                      <CardTitle className="mt-2 text-2xl font-headline leading-tight">
                        <Link href={`/blog/${post.slug}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {post.excerpt || post.content.slice(0, 140)}
                      </p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <Button asChild variant="ghost" className="px-0 text-sm">
                        <Link href={`/blog/${post.slug}`} className="flex items-center gap-2">
                          Read more
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="outline">
                <Link href="/blog">
                  Explore the blog <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

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
                <Image
                  src={heroImage}
                  alt={primarySlide?.title ?? siteSettings.heroTitle}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
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
