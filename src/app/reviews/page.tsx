import Image from 'next/image';
import { reviews } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const heroImage = PlaceHolderImages.find(p => p.id === 'reviews-hero');

export default function ReviewsPage() {
  const approvedReviews = reviews.filter((r) => r.status === 'approved');

  return (
    <div>
      <section className="relative w-full h-[30vh] md:h-[40vh] bg-secondary">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
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
            
            {/* Placeholder for Tripadvisor */}
            <Card className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed">
              <CardContent className="text-center p-6">
                <svg width="100" height="auto" viewBox="0 0 242 148" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4"><path d="M158.07 101.37C158.07 88.77 147.87 78.57 135.27 78.57C122.67 78.57 112.47 88.77 112.47 101.37C112.47 113.97 122.67 124.17 135.27 124.17C147.87 124.17 158.07 113.97 158.07 101.37ZM84.15 101.37C84.15 88.77 73.95 78.57 61.35 78.57C48.75 78.57 38.55 88.77 38.55 101.37C38.55 113.97 48.75 124.17 61.35 124.17C73.95 124.17 84.15 113.97 84.15 101.37Z" fill="#34E0A1"/><path d="M121.5 0C54.45 0 0 54.45 0 121.5C0 132.3 2.25 142.65 6.3 152.1L121.5 12.15C188.55 12.15 242.1 65.7 242.1 132.75C242.1 135.9 241.95 138.9 241.5 141.9L242.1 141.75V121.5C242.1 54.45 188.55 0 121.5 0Z" fill="#F2B203"/><path d="M225.12 119.52C225.12 109.92 217.47 102.27 207.87 102.27C198.27 102.27 190.62 109.92 190.62 119.52C190.62 129.12 198.27 136.77 207.87 136.77C217.47 136.77 225.12 129.12 225.12 119.52Z" fill="#34E0A1"/></svg>
                <h3 className="font-bold font-body text-lg text-muted-foreground">Tripadvisor Reviews</h3>
                <p className="text-sm text-muted-foreground">See our profile on Tripadvisor.</p>
              </CardContent>
            </Card>

            {approvedReviews.map((review) => (
              <Card key={review.id} className="flex flex-col shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={`https://i.pravatar.cc/150?u=${review.name}`} />
                        <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-body font-bold">{review.name}</CardTitle>
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
                  <Badge variant="outline">{review.tourName}</Badge>
                  <span>{format(review.createdAt, 'MMM d, yyyy')}</span>
                </CardFooter>
              </Card>
            ))}

            {/* Placeholder for Google Reviews */}
             <Card className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed">
              <CardContent className="text-center p-6">
                <svg width="100" height="auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4"><path d="M21.85,10.16H21.5V10.15H12.23V14.24H17.84C17.63,15.63 16.92,16.84 15.82,17.56V20.25H19.06C20.93,18.52 22.1,16.03 22.1,13.04C22.1,12.01 22,11.05 21.85,10.16Z" fill="#4285F4"/><path d="M12.23,22.4C15.11,22.4 17.5,21.49 19.06,20.25L15.82,17.56C14.88,18.22 13.67,18.62 12.23,18.62C9.53,18.62 7.24,16.8 6.43,14.41H3.08V17.21C4.6,20.27 8.11,22.4 12.23,22.4Z" fill="#34A853"/><path d="M6.43,14.41C6.21,13.75 6.09,13.06 6.09,12.36C6.09,11.65 6.21,10.96 6.42,10.3L3.08,7.5C1.83,9.83 1.14,12.36 1.14,15.07C1.14,17.78 1.83,20.31 3.08,22.64L6.43,19.84V14.41Z" fill="#FBBC05"/><path d="M12.23,6.18C13.79,6.18 15.19,6.72 16.2,7.66L19.14,4.72C17.5,3.18 15.1,2.3 12.23,2.3C8.11,2.3 4.6,4.43 3.08,7.5L6.42,10.3C7.24,7.9 9.53,6.18 12.23,6.18Z" fill="#EA4335"/></svg>
                <h3 className="font-bold font-body text-lg text-muted-foreground">Google Reviews</h3>
                <p className="text-sm text-muted-foreground">Find us on Google.</p>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>
    </div>
  );
}
