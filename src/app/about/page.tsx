import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicContent } from '@/lib/content-service';

export default async function AboutPage() {
  const { siteSettings, stories } = await getPublicContent();
  const heroImage = siteSettings.heroMediaUrl;

  return (
    <div>
      <section className="relative w-full h-[30vh] md:h-[40vh] bg-secondary">
        {heroImage && (
          <Image src={heroImage} alt={siteSettings.heroTitle} fill className="object-cover" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">About Trang</h1>
          <p className="mt-4 max-w-3xl text-lg md:text-xl text-primary-foreground/90 font-body">
            Boutique tour designer crafting soulful journeys across Vietnam.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-bold">{siteSettings.aboutTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {siteSettings.aboutDescription}
            </p>
            {siteSettings.missionStatement && (
              <Card className="mt-8 border-l-4 border-l-accent bg-secondary/50">
                <CardHeader>
                  <CardTitle className="text-xl font-headline">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{siteSettings.missionStatement}</p>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-headline font-semibold">What travellers appreciate</h3>
            {siteSettings.values?.map((value) => (
              <Card key={value} className="bg-card/60">
                <CardContent className="p-4 text-sm text-muted-foreground leading-relaxed">{value}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-secondary/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center">Latest Stories</h2>
          <p className="mt-4 text-center max-w-2xl mx-auto text-muted-foreground">
            Field notes and behind-the-scenes glimpses from recent bespoke journeys.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Card key={story.id} className="overflow-hidden">
                {story.coverImageUrl && (
                  <div className="relative h-48 w-full">
                    <Image src={story.coverImageUrl} alt={story.title} fill className="object-cover" sizes="(min-width:768px) 33vw, 100vw" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl font-headline">{story.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{story.excerpt}</p>
                  <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                    {story.publishedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
