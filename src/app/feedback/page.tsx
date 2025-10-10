import Image from 'next/image';
import FeedbackForm from '@/components/feedback-form';
import { getPublicContent } from '@/lib/content-service';

export default async function FeedbackPage() {
  const { siteSettings, tours } = await getPublicContent();
  const heroImage = siteSettings.heroMediaUrl;

  return (
    <div>
      <section className="relative w-full h-[30vh] md:h-[40vh] bg-secondary">
        {heroImage && (
          <Image
            src={heroImage}
            alt={siteSettings.heroTitle}
            fill
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Share Your Experience</h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 font-body">
            Your feedback helps us and fellow travellers.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <FeedbackForm tours={tours.map((tour) => ({ id: tour.id, name: tour.name }))} />
          </div>
        </div>
      </section>
    </div>
  );
}
