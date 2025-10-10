import Link from "next/link";
import { MessageSquare, Twitter, Facebook, Instagram } from "lucide-react";

export default function Footer() {
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
                <li><Link href="/reviews" className="hover:text-accent">Reviews</Link></li>
                <li><Link href="/feedback" className="hover:text-accent">Leave Feedback</Link></li>
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
              <div className="mt-4 flex gap-4">
                <Link href="#" aria-label="Twitter"><Twitter className="h-6 w-6 text-muted-foreground hover:text-accent" /></Link>
                <Link href="#" aria-label="Facebook"><Facebook className="h-6 w-6 text-muted-foreground hover:text-accent" /></Link>
                <Link href="#" aria-label="Instagram"><Instagram className="h-6 w-6 text-muted-foreground hover:text-accent" /></Link>
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
