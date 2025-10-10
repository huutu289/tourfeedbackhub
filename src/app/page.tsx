import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { tours, reviews } from '@/lib/data';
import TourCard from '@/components/tour-card';

const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
const reviewImage = PlaceHolderImages.find(p => p.id === 'review-banner');

export default function Home() {
  const approvedReviews = reviews.filter(r => r.status === 'approved').slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[60vh] md:h-[80vh]">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold !leading-tight">
            Share Your Journey, Shape Ours
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 font-body">
            Your feedback lights our path. Tell us about your adventure and help us create unforgettable experiences for everyone.
          </p>
          <Button asChild size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/feedback">
              Leave a Review <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section id="tours" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">Popular Tours</h2>
          <p className="mt-4 text-center max-w-2xl mx-auto text-muted-foreground">
            Explore our most beloved adventures, crafted from journeys and stories shared by travelers like you.
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
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${review.name}`} />
                      <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-body text-lg font-bold">{review.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{review.country}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">&quot;{review.message}&quot;</p>
                </CardContent>
                <CardFooter>
                    <Badge variant="secondary">{review.tourName}</Badge>
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
                    {reviewImage && (
                        <Image
                            src={reviewImage.imageUrl}
                            alt={reviewImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={reviewImage.imageHint}
                        />
                    )}
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-headline font-bold">Your Voice Matters</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Every piece of feedback is a stepping stone to a better experience. Your reviews help us refine our tours and guide future travelers.
                    </p>
                    <Button asChild size="lg" className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link href="/feedback">
                            Share Your Experience
                        </Link>
                    </Button>
                </div>
            </div>
         </div>
      </section>

    </div>
  );
}
