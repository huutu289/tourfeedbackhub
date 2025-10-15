'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Facebook, Instagram, Mail, Phone, MessageCircle } from "lucide-react";
import type { ContactInfo } from "@/lib/types";

interface FooterProps {
  contact: ContactInfo;
}

export default function Footer({ contact }: FooterProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-accent" />
              <span className="text-xl font-headline font-bold">Tour Insights Hub</span>
            </Link>
            <p className="text-muted-foreground">
              Shaping unforgettable adventures, one review at a time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-4">
            <div>
              <h4 className="font-semibold font-body">Navigate</h4>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li><Link href="/" className="hover:text-accent">Home</Link></li>
                <li><Link href="/about" className="hover:text-accent">About</Link></li>
                <li><Link href="/tour-types" className="hover:text-accent">Tour Types</Link></li>
                <li><Link href="/tours" className="hover:text-accent">Tours</Link></li>
                <li><Link href="/stories" className="hover:text-accent">Stories</Link></li>
                <li><Link href="/reviews" className="hover:text-accent">Reviews</Link></li>
                <li><Link href="/feedback" className="hover:text-accent">Leave Feedback</Link></li>
                <li><Link href="/contact" className="hover:text-accent">Contact</Link></li>
              </ul>
            </div>
             <div>
              <h4 className="font-semibold font-body">Tours</h4>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-accent">Mountain Escape</Link></li>
                <li><Link href="#" className="hover:text-accent">Coastal Wonders</Link></li>
                <li><Link href="#" className="hover:text-accent">City Lights</Link></li>
                 <li><Link href="#" className="hover:text-accent">Historical Paths</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold font-body">Legal</h4>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-accent">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-accent">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold font-body">Connect</h4>
              <div className="mt-4 space-y-2 text-muted-foreground">
                {contact.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Link href={`mailto:${contact.email}`} className="hover:text-accent">{contact.email}</Link>
                  </p>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <Link href={`tel:${contact.phone}`} className="hover:text-accent">{contact.phone}</Link>
                  </p>
                )}
                <div className="flex gap-3 pt-2 text-foreground/70">
                  {contact.whatsapp && (
                    <Link href={contact.whatsapp} aria-label="WhatsApp" className="hover:text-accent"><MessageCircle className="h-6 w-6" /></Link>
                  )}
                  {contact.facebook && (
                    <Link href={contact.facebook} aria-label="Facebook" className="hover:text-accent"><Facebook className="h-6 w-6" /></Link>
                  )}
                  {contact.instagram && (
                    <Link href={contact.instagram} aria-label="Instagram" className="hover:text-accent"><Instagram className="h-6 w-6" /></Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Tour Insights Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
