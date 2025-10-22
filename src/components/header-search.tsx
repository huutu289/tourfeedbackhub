'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/search-bar';

export default function HeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-10 w-10 rounded-full border border-border/60 text-foreground/80 transition hover:border-accent hover:text-accent md:flex"
          aria-label="Search the site"
        >
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-headline">Search the site</DialogTitle>
          <DialogDescription>Find tours, stories, and planning advice in a few keystrokes.</DialogDescription>
        </DialogHeader>
        <Separator className="mt-4" />
        <div className="p-6">
          <SearchBar />
          <p className="mt-4 text-xs text-muted-foreground">
            Tip: Press <kbd className="rounded border bg-muted px-1 text-[10px]">⌘</kbd>
            <span className="mx-1">/</span>
            <kbd className="rounded border bg-muted px-1 text-[10px]">Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd className="rounded border bg-muted px-1 text-[10px]">K</kbd> to open search anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
