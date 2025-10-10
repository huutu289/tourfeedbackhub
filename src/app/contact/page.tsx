import Link from 'next/link';
import { Mail, Phone, MessageCircle, Facebook, Instagram, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPublicContent } from '@/lib/content-service';

export default async function ContactPage() {
  const { siteSettings } = await getPublicContent();
  const { contact } = siteSettings;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Let’s Plan Your Journey</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Share your travel aspirations and I will craft a bespoke itinerary with trusted partners, meaningful encounters, and seamless coordination.
          </p>

          <div className="mt-10 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Direct Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {contact.email && (
                  <p className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-accent" />
                    <Link href={`mailto:${contact.email}`} className="hover:text-accent">
                      {contact.email}
                    </Link>
                  </p>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-accent" />
                    <Link href={`tel:${contact.phone}`} className="hover:text-accent">
                      {contact.phone}
                    </Link>
                  </p>
                )}
                {contact.location && (
                  <p className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-accent" />
                    <span>{contact.location}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Messaging Apps</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {contact.whatsapp && (
                  <Button asChild variant="outline">
                    <Link href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                    </Link>
                  </Button>
                )}
                {contact.zalo && (
                  <Button asChild variant="outline">
                    <Link href={contact.zalo} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" /> Zalo
                    </Link>
                  </Button>
                )}
                {contact.facebook && (
                  <Button asChild variant="outline">
                    <Link href={contact.facebook} target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4 mr-2" /> Facebook
                    </Link>
                  </Button>
                )}
                {contact.instagram && (
                  <Button asChild variant="outline">
                    <Link href={contact.instagram} target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4 mr-2" /> Instagram
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Quick Briefing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Ready to co-create your itinerary? Send a short brief with preferred dates, group size, key interests, and desired pace. I will follow up within 24 hours with curated ideas and next steps.
            </p>
            <Button asChild size="lg">
              <Link href="/feedback">Submit feedback or a trip brief</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
