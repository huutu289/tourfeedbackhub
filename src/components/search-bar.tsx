'use client';

import {useState, useEffect, useRef} from 'react';
import {Search, X, FileText, Image as ImageIcon, Tag, Folder} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import Link from 'next/link';
import type {Post, MediaItem, Category, Tag as TagType} from '@/lib/types';

interface SearchResult {
  type: 'post' | 'page' | 'media' | 'category' | 'tag';
  id: string;
  title: string;
  excerpt?: string;
  url: string;
  matchScore?: number;
}

export function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    const searchContent = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        // TODO: Implement actual search using Firestore queries or Algolia
        // For now, simulate search delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mock search results
        const mockResults: SearchResult[] = [
          {
            type: 'post',
            id: '1',
            title: 'Getting Started with Next.js',
            excerpt: 'Learn the basics of Next.js and build your first application...',
            url: '/blog/getting-started-nextjs',
            matchScore: 95,
          },
          {
            type: 'page',
            id: '2',
            title: 'About Us',
            excerpt: 'Learn more about our company and mission...',
            url: '/about',
            matchScore: 80,
          },
          {
            type: 'category',
            id: '3',
            title: 'Web Development',
            url: '/category/web-development',
            matchScore: 70,
          },
        ];

        setResults(mockResults);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'post':
      case 'page':
        return <FileText className="h-4 w-4" />;
      case 'media':
        return <ImageIcon className="h-4 w-4" />;
      case 'category':
        return <Folder className="h-4 w-4" />;
      case 'tag':
        return <Tag className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: SearchResult['type']) => {
    const variants = {
      post: 'Post',
      page: 'Page',
      media: 'Media',
      category: 'Category',
      tag: 'Tag',
    };

    return <Badge variant="outline" className="text-xs">{variants[type]}</Badge>;
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-2xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search posts, pages, media..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => (
                  <div key={result.id}>
                    {index > 0 && <Separator className="my-1" />}
                    <Link
                      href={result.url}
                      onClick={handleResultClick}
                      className="block p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-muted-foreground">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{result.title}</h4>
                            {getTypeBadge(result.type)}
                          </div>
                          {result.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {result.excerpt}
                            </p>
                          )}
                        </div>
                        {result.matchScore && (
                          <div className="text-xs text-muted-foreground shrink-0">
                            {result.matchScore}%
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}

                <Separator className="my-2" />
                <div className="p-2">
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={handleResultClick}
                    className="block text-sm text-primary hover:underline text-center"
                  >
                    View all results for "{query}"
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try different keywords or check spelling
                </p>
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
