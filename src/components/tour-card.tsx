import Image from "next/image";
import Link from "next/link";
import { CalendarRange, MapPin, Users, Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Tour } from "@/lib/types";

interface TourCardProps {
  tour: Tour;
}

export default function TourCard({ tour }: TourCardProps) {
  const coverImage = tour.photoUrls?.[0];
  const start = tour.startDate instanceof Date ? tour.startDate : new Date(tour.startDate);
  const end = tour.endDate instanceof Date ? tour.endDate : new Date(tour.endDate);
  const formattedDates = `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
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
        <CardTitle className="font-headline text-2xl">{tour.name}</CardTitle>
        <CardDescription className="mt-2 text-base">{tour.summary}</CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0">
        <div className="w-full flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span>{formattedDates}</span>
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
