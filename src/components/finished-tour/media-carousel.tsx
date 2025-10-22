"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import useEmblaCarousel, { EmblaCarouselType } from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaCarouselProps {
  photos?: string[];
  videos?: string[];
}

interface Slide {
  id: string;
  type: "image" | "video";
  url: string;
}

export function MediaCarousel({ photos = [], videos = [] }: MediaCarouselProps) {
  const slides: Slide[] = useMemo(() => {
    const imageSlides = photos
      .filter((url) => typeof url === "string" && url.trim().length > 0)
      .map((url, index) => ({
        id: `photo-${index}-${url}`,
        type: "image" as const,
        url,
      }));

    const videoSlides = videos
      .filter((url) => typeof url === "string" && url.trim().length > 0)
      .map((url, index) => ({
        id: `video-${index}-${url}`,
        type: "video" as const,
        url,
      }));

    return [...imageSlides, ...videoSlides];
  }, [photos, videos]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: slides.length > 1,
    skipSnaps: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl shadow-lg" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
              {slide.type === "image" ? (
                <div className="relative aspect-[4/3] w-full bg-muted">
                  <Image
                    src={slide.url}
                    alt="Tour keepsake"
                    fill
                    className="object-cover"
                    sizes="(min-width:1280px) 60vw, (min-width:768px) 80vw, 100vw"
                    priority={false}
                  />
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
                  <video controls className="h-full w-full">
                    <source src={slide.url} />
                    <track kind="captions" />
                  </video>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur transition hover:bg-background disabled:opacity-40"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous media"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur transition hover:bg-background disabled:opacity-40"
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next media"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={`${slide.id}-dot`}
                type="button"
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition",
                  index === selectedIndex ? "bg-accent" : "bg-border hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to media ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
