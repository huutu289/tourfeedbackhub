import Image from "next/image";
import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Tour } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface TourCardProps {
  tour: Tour;
}

export default function TourCard({ tour }: TourCardProps) {
  const image = PlaceHolderImages.find(p => p.id === tour.imageId);

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="relative h-56 w-full">
          {image && (
            <Image
              src={image.imageUrl}
              alt={tour.name}
              fill
              className="object-cover"
              data-ai-hint={image.imageHint}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <CardTitle className="font-headline text-2xl">{tour.name}</CardTitle>
        <CardDescription className="mt-2 text-base">{tour.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0">
        <div className="w-full flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{tour.duration}</span>
            </div>
             <div className="flex items-center gap-2 font-semibold text-foreground">
                <Tag className="w-4 h-4" />
                <span>${tour.price}</span>
            </div>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/tours/${tour.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
