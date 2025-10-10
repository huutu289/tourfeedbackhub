import Image from "next/image";
import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Tour } from "@/lib/types";

interface TourCardProps {
  tour: Tour;
}

export default function TourCard({ tour }: TourCardProps) {
  const coverImage = tour.mediaUrls?.[0];
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
        <div className="w-full flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{tour.durationLabel}</span>
            </div>
             <div className="flex items-center gap-2 font-semibold text-foreground">
                <Tag className="w-4 h-4" />
                <span>From ${tour.priceFrom}</span>
            </div>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/contact?interest=${encodeURIComponent(tour.id)}`}>
            Plan This Tour
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
