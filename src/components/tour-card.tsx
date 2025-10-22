import Image from "next/image";
import Link from "next/link";
import { CalendarRange, MapPin, Users, Languages, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Tour } from "@/lib/types";

interface RatingSummary {
  average: number;
  count: number;
}

interface TourCardProps {
  tour: Tour;
  ratingSummary?: RatingSummary | null;
}

export default function TourCard({ tour, ratingSummary }: TourCardProps) {
  const coverImage = tour.photoUrls?.[0];
  const start = tour.startDate instanceof Date ? tour.startDate : new Date(tour.startDate);
  const end = tour.endDate instanceof Date ? tour.endDate : new Date(tour.endDate);
  const durationInDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const formattedDates = `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
  const averageLabel = ratingSummary && ratingSummary.count > 0
    ? `${ratingSummary.average.toFixed(1)} / 5`
    : 'Awaiting reviews';

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="relative h-56 w-full">
          {coverImage && (
            <Image
              src={coverImage}
              alt={tour.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-headline text-2xl leading-snug">{tour.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 text-xs uppercase tracking-wide">
            {tour.code}
          </Badge>
        </div>
        <CardDescription className="mt-2 line-clamp-3 text-base text-muted-foreground">
          {tour.summary}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0">
        <div className="w-full flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span>{formattedDates}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 opacity-0" aria-hidden />
            <span className="text-xs uppercase tracking-wide text-foreground/60">
              {durationInDays} day{durationInDays === 1 ? '' : 's'} on the road
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>
              {tour.clientCity}, {tour.clientCountry}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{tour.clientCount} travellers ・ Guide {tour.guideName}</span>
          </div>
          {tour.guideLanguages?.length ? (
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <span>{tour.guideLanguages.join(', ')}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-foreground">
            <Star
              className={`h-4 w-4 ${ratingSummary && ratingSummary.count > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
            <span className="text-sm font-medium">
              {averageLabel}
              {ratingSummary && ratingSummary.count > 0 ? ` • ${ratingSummary.count} review${ratingSummary.count === 1 ? '' : 's'}` : ''}
            </span>
          </div>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/tours/${tour.id}`}>
            View Tour Diary
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
