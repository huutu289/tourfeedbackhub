import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { getPublicContent } from '@/lib/content-service';

export default async function ApprovedReviewsPage() {
  const { reviews } = await getPublicContent();
  const approvedReviews = reviews.filter((r) => r.status === 'approved');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Approved Reviews</h1>
        <p className="text-muted-foreground">
          Here are all the reviews currently displayed on the public website.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {approvedReviews.map((review) => (
          <Card key={review.id} className="flex flex-col">
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
              <span>{format(review.createdAt, 'MMM d, yyyy')}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
