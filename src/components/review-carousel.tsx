'use client';

import { useMemo } from 'react';
import { Star, Quote } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Review } from '@/lib/types';

interface ReviewCarouselProps {
  reviews: Review[];
}

export default function ReviewCarousel({ reviews }: ReviewCarouselProps) {
  const slides = useMemo(() => reviews.slice(0, 8), [reviews]);

  if (slides.length === 0) {
    return (
      <div className="rounded-lg border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Reviews will appear here once guests share their experiences.
      </div>
    );
  }

  return (
    <Carousel className="relative">
      <CarouselContent>
        {slides.map((review) => (
          <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
            <Card className="h-full bg-background/70 shadow-lg">
              <CardHeader className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${review.authorDisplay}`} />
                      <AvatarFallback>{review.authorDisplay.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base font-semibold">{review.authorDisplay}</CardTitle>
                      <p className="text-xs text-muted-foreground">{review.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400' : 'text-muted-foreground/40'}`} />
                    ))}
                  </div>
                </div>
                {review.tourName ? (
                  <Badge variant="outline" className="w-fit">{review.tourName}</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Quote className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm leading-relaxed text-muted-foreground">“{review.message}”</p>
                <p className="text-xs text-muted-foreground/80">
                  {review.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute -left-4 top-1/2 hidden -translate-y-1/2 shadow-md md:flex" />
      <CarouselNext className="absolute -right-4 top-1/2 hidden -translate-y-1/2 shadow-md md:flex" />
    </Carousel>
  );
}
