'use client';

import {Suspense, useState, useEffect} from 'react';
import {Search, Filter, SlidersHorizontal} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import type {Post, Category, Tag} from '@/lib/types';
import {format} from 'date-fns';

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['post', 'page']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('all');

  // Mock data - replace with real data
  const categories: Category[] = [];
  const tags: Tag[] = [];

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, selectedTypes, selectedCategories, selectedTags, dateRange, sortBy]);

  const performSearch = async () => {
    setLoading(true);

    try {
      // TODO: Implement actual search with Firestore or Algolia
      // Consider indexing content for better search performance

      // Simulate search
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock results
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Search</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for posts, pages, media..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-11 h-12 text-lg"
              />
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-4 w-4" />
                <h3 className="font-semibold">Filters</h3>
              </div>

              {/* Content Type Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm">
                  Content Type
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {['post', 'page', 'media'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleType(type)}
                      />
                      <Label htmlFor={`type-${type}`} className="text-sm capitalize cursor-pointer">
                        {type}s
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Categories Filter */}
              {categories.length > 0 && (
                <>
                  <div className="my-4 border-t" />
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm">
                      Categories
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 max-h-48 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`cat-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => {
                              setSelectedCategories(prev =>
                                prev.includes(category.id)
                                  ? prev.filter(c => c !== category.id)
                                  : [...prev, category.id]
                              );
                            }}
                          />
                          <Label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer">
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* Date Range Filter */}
              <div className="my-4 border-t" />
              <div className="py-2">
                <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(selectedCategories.length > 0 || selectedTags.length > 0 || dateRange !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedTags([]);
                    setDateRange('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-muted-foreground">
                  {results.length > 0 ? (
                    <>
                      Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}{' '}
                      for "<strong>{query}</strong>"
                    </>
                  ) : query ? (
                    <>No results found for "<strong>{query}</strong>"</>
                  ) : (
                    'Enter a search query to begin'
                  )}
                </p>
              </div>

              {results.length > 0 && (
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Most Relevant</SelectItem>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </Card>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {result.featuredImage && (
                        <img
                          src={result.featuredImage.url}
                          alt={result.title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          {result.publishedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(result.publishedAt, 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <Link href={`/blog/${result.slug}`}>
                          <h3 className="text-xl font-semibold mb-2 hover:text-primary">
                            {result.title}
                          </h3>
                        </Link>
                        {result.excerpt && (
                          <p className="text-muted-foreground line-clamp-2 mb-3">
                            {result.excerpt}
                          </p>
                        )}
                        {result.categories && result.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.categories.map((cat) => (
                              <Badge key={cat.id} variant="secondary" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : query ? (
              <Card className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find anything matching your search. Try:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Checking your spelling</li>
                  <li>• Using different keywords</li>
                  <li>• Removing filters</li>
                  <li>• Making your search more general</li>
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Search</h1>
        <Card className="p-6">
          <div className="h-6 bg-muted rounded w-2/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </Card>
      </div>
    </div>
  );
}
