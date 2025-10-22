'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

import type { HeroSlide } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function isInternalLink(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#');
}

function clampOpacity(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.35;
  }
  return Math.min(1, Math.max(0, value));
}

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Filter out slides with failed images
  const validSlides = slides.filter(slide => 
    slide.imageUrl && 
    slide.imageUrl.trim() !== '' && 
    !failedImages.has(slide.id)
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 20 // Smooth transition duration
  });

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    setIsPaused(mediaQuery.matches);

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
      setIsPaused(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update selected index on slide change
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Navigation handlers
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const pauseAutoplay = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeAutoplay = useCallback(() => {
    if (!prefersReducedMotion) {
      setIsPaused(false);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!emblaApi) return;
    if (isPaused || prefersReducedMotion) return;

    const autoplayId = window.setInterval(() => {
      if (!emblaApi) return;
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      window.clearInterval(autoplayId);
    };
  }, [emblaApi, isPaused, prefersReducedMotion]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  const handleImageError = (slideId: string) => {
    console.warn(`Failed to load image for slide: ${slideId}`);
    setFailedImages(prev => new Set(prev).add(slideId));
  };

  if (!validSlides.length) {
    return null;
  }

  return (
    <section
      className="relative w-full overflow-hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero Carousel"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
      onFocusCapture={pauseAutoplay}
      onBlurCapture={resumeAutoplay}
    >
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {validSlides.map((slide, index) => {
            const overlayStrength = clampOpacity(slide.overlayOpacity);
            const isInternal = isInternalLink(slide.buttonLink);

            return (
              <div
                key={slide.id}
                className="embla__slide relative min-w-0 shrink-0 grow-0 basis-full"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}`}
              >
                <div className="relative w-full h-[60vh] min-h-[400px] sm:h-[70vh] sm:min-h-[500px] md:h-[85vh] md:min-h-[600px] lg:h-[90vh] bg-gray-900">
                  {/* Blurred Background (Desktop only) */}
                  {slide.imageUrl && (
                    <div className="hidden md:block absolute inset-0">
                      <Image
                        src={slide.imageUrl}
                        alt=""
                        fill
                        className="object-cover object-center blur-2xl scale-110 opacity-40"
                        priority={index === 0}
                        sizes="100vw"
                        quality={60}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  
                  {/* Main Image */}
                  {slide.imageUrl && (
                    <Image
                      src={slide.imageUrl}
                      alt={slide.alt ?? slide.title}
                      fill
                      className="relative object-cover object-center z-10"
                      priority={index === 0}
                      sizes="100vw"
                      quality={90}
                      onError={() => handleImageError(slide.id)}
                    />
                  )}

                  {/* Gradient Overlay with CMS Opacity */}
                  <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
                    <div
                      className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60"
                      style={{ opacity: overlayStrength }}
                    />
                  </div>

                  {/* Content Container - Bottom Single Row */}
                  <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center px-4 py-6 sm:py-8 md:py-10">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-full max-w-7xl"
                    >
                      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                        {/* Title */}
                        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                          <span className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur">
                            Guiding Boutique Adventures Across Vietnam
                          </span>
                          <h1
                            className="font-headline text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)]"
                          >
                            {slide.title}
                          </h1>
                        </div>

                        {/* Subtitle */}
                        {slide.subtitle && (
                          <p
                            className="font-body text-sm sm:text-base md:text-lg lg:text-xl text-white/90 backdrop-blur-sm rounded-full bg-black/30 px-4 py-2"
                          >
                            {slide.subtitle}
                          </p>
                        )}

                        {/* CTA Button */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {slide.buttonText && slide.buttonLink ? (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Button
                                asChild
                                size="lg"
                                className="group rounded-full h-10 sm:h-11 md:h-12 lg:h-14 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-2xl shadow-xl text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 px-5 sm:px-7 md:px-9 lg:px-11"
                              >
                                {isInternal ? (
                                  <Link href={slide.buttonLink} className="flex items-center justify-center gap-1.5">
                                    {slide.buttonText}
                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </Link>
                                ) : (
                                  <a
                                    href={slide.buttonLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-1.5"
                                  >
                                    {slide.buttonText}
                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </a>
                                )}
                              </Button>
                            </motion.div>
                          ) : null}
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                            <Button
                              asChild
                              size="lg"
                              variant="secondary"
                              className="rounded-full bg-white/20 text-white hover:bg-white/30"
                            >
                              <Link href="/tours" className="flex items-center gap-2">
                                Explore Tours
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                            <Button
                              asChild
                              size="lg"
                              variant="ghost"
                              className="rounded-full border border-white/40 text-white hover:bg-white/10"
                            >
                              <Link href="/stories" className="flex items-center gap-2">
                                See Diaries
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows - Hidden on mobile */}
      {validSlides.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={scrollNext}
            className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {validSlides.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {validSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                'transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50',
                selectedIndex === index
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/70'
              )}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={selectedIndex === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Pause Indicator (for accessibility) */}
      {isPaused && !prefersReducedMotion && (
        <div className="sr-only" role="status" aria-live="polite">
          Carousel paused
        </div>
      )}
    </section>
  );
}
