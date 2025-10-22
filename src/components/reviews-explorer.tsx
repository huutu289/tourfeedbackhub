'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ClientReview {
  id: string;
  authorDisplay: string;
  country: string;
  rating: number;
  message: string;
  tourName?: string | null;
  createdAt: string;
}

interface ReviewsExplorerProps {
  reviews: ClientReview[];
  tourNames: string[];
}

function matchesRating(rating: number, filter: string) {
  if (filter === 'all') return true;
  if (filter === '5') return rating === 5;
  if (filter === '4') return rating >= 4;
  if (filter === '3') return rating >= 3;
  return true;
}

function matchesTimeframe(date: Date, filter: string) {
  if (filter === 'all') return true;
  const months = Number(filter);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return date >= cutoff;
}

export default function ReviewsExplorer({ reviews, tourNames }: ReviewsExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const search = searchQuery.trim().toLowerCase();
      if (search) {
        const haystack = `${review.authorDisplay} ${review.country} ${review.tourName ?? ''} ${review.message}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (!matchesRating(review.rating, ratingFilter)) {
        return false;
      }

      if (tourFilter !== 'all' && review.tourName !== tourFilter) {
        return false;
      }

      const createdAt = new Date(review.createdAt);
      if (!matchesTimeframe(createdAt, timeframeFilter)) {
        return false;
      }

      return true;
    });
  }, [reviews, searchQuery, ratingFilter, tourFilter, timeframeFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setRatingFilter('all');
    setTourFilter('all');
    setTimeframeFilter('all');
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reviewer, country, or keywords"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rating
            </label>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars</SelectItem>
                <SelectItem value="4">4 stars & up</SelectItem>
                <SelectItem value="3">3 stars & up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tour
            </label>
            <Select value={tourFilter} onValueChange={setTourFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All tours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tours</SelectItem>
                {tourNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timeframe
            </label>
            <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(searchQuery || ratingFilter !== 'all' || tourFilter !== 'all' || timeframeFilter !== 'all') && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/80 p-12 text-center text-muted-foreground">
          No reviews match those filters just yet. Try expanding your search or choose a different rating.
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="flex h-full flex-col border-border/60 bg-background/80 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-headline">{review.authorDisplay}</CardTitle>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{review.country}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400' : 'text-muted-foreground/40'}`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
                <p className="leading-relaxed">“{review.message}”</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground/80">
                  <time dateTime={review.createdAt}>{format(new Date(review.createdAt), 'MMM d, yyyy')}</time>
                  {review.tourName ? <Badge variant="outline">{review.tourName}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
