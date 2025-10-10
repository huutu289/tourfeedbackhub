import Image from 'next/image';
import FeedbackForm from '@/components/feedback-form';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const heroImage = PlaceHolderImages.find(p => p.id === 'feedback-hero');

export default function FeedbackPage() {
  return (
    <div>
       <section className="relative w-full h-[30vh] md:h-[40vh] bg-secondary">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Share Your Experience</h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 font-body">
            Your feedback helps us and fellow travelers.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
                <FeedbackForm />
            </div>
        </div>
      </section>
    </div>
  );
}
