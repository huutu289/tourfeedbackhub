'use client';

import Link from 'next/link';
import { MessageSquare, Menu, UserCog } from 'lucide-react';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const baseNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/tour-types', label: 'Tour Types' },
  { href: '/tours', label: 'Tours' },
  { href: '/stories', label: 'Stories' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

const adminLink = { href: '/admin/dashboard', label: 'Admin', icon: UserCog };

export default function Header() {
  const { isAdmin } = useAdmin();

  const navLinks = isAdmin ? [...baseNavLinks, adminLink] : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-accent" />
          <span className="font-bold font-headline text-lg">
            Tour Insights Hub
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {baseNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-accent text-foreground/80"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end">
          {isAdmin && (
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link href={adminLink.href}>
                <UserCog className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="p-6">
                  <Link href="/" className="mr-6 flex items-center space-x-2 mb-8">
                     <MessageSquare className="h-6 w-6 text-accent" />
                     <span className="font-bold font-headline text-lg">Tour Insights Hub</span>
                  </Link>
                  <nav className="flex flex-col space-y-4">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          className="text-lg text-foreground/80 hover:text-accent"
                        >
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <Button asChild className="hidden md:flex ml-4">
            <Link href="/feedback">Share Your Story</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
