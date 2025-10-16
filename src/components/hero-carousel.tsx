'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { HeroSlide } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

function isInternalLink(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#');
}

function clampOpacity(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  if (!slides.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <Carousel className="h-full">
        <CarouselContent className="h-full">
          {slides.map((slide, index) => {
            const overlayOpacity = clampOpacity(slide.overlayOpacity);
            const isInternal = isInternalLink(slide.buttonLink);

            return (
              <CarouselItem key={slide.id} className="h-full">
                <div className="relative w-full min-h-[60vh] md:min-h-[70vh] lg:min-h-[75vh] max-h-[90vh] overflow-hidden bg-black">
                  {slide.imageUrl ? (
                    <Image
                      src={slide.imageUrl}
                      alt={slide.alt ?? slide.title}
                      fill
                      className="object-contain"
                      priority={index === 0}
                      sizes="100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted" aria-hidden />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
                    aria-hidden
                  />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center text-white">
                    <div className="max-w-4xl space-y-4">
                      <h1 className="font-headline text-4xl font-bold !leading-tight md:text-6xl lg:text-7xl">
                        {slide.title}
                      </h1>
                      {slide.subtitle ? (
                        <p className="font-body text-lg text-primary-foreground/90 md:text-xl">
                          {slide.subtitle}
                        </p>
                      ) : null}
                      {slide.buttonText ? (
                        <Button
                          asChild
                          size="lg"
                          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isInternal ? (
                            <Link href={slide.buttonLink}>
                              {slide.buttonText}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                          ) : (
                            <a href={slide.buttonLink} target="_blank" rel="noreferrer">
                              {slide.buttonText}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </a>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {slides.length > 1 ? (
          <>
            <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2" variant="secondary" />
            <CarouselNext className="right-4 top-1/2 -translate-y-1/2" variant="secondary" />
          </>
        ) : null}
      </Carousel>
    </section>
  );
}
