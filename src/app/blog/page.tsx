'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {collection, query, orderBy} from 'firebase/firestore';
import {useFirestore} from '@/firebase/provider';
import {useCollection, type WithId} from '@/firebase/firestore/use-collection';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import type {Post, PostStatus, Category, Tag, PostType} from '@/lib/types';
import {format} from 'date-fns';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardFooter, CardHeader} from '@/components/ui/card';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Loader2, Search, Calendar, User, ChevronRight} from 'lucide-react';
import {Breadcrumb} from '@/components/breadcrumb';
import {WebSiteStructuredData} from '@/components/structured-data';

const POSTS_PER_PAGE = 12;

export default function BlogPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch published posts
  const postsRef = useMemoFirebase(
    () => query(collection(firestore, 'posts'), orderBy('publishedAt', 'desc')),
    [firestore]
  );

  const {data: postsData, isLoading: postsLoading} = useCollection(postsRef);

  // Fetch categories
  const categoriesRef = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const {data: categoriesData} = useCollection(categoriesRef);

  // Create categories map for lookup
  const categoriesMap = useMemo(() => {
    if (!categoriesData) return new Map();
    return new Map(
      categoriesData.map((doc) => [
        doc.id,
        {
          id: doc.id,
          name: doc.name || 'Untitled',
          slug: doc.slug || doc.id,
          description: doc.description,
          count: doc.count || 0,
          createdAt: doc.createdAt?.toDate?.() || new Date(),
        },
      ])
    );
  }, [categoriesData]);

  const posts: Post[] = useMemo(() => {
    if (!postsData) return [];
    return postsData
      .map((doc) => {
        const type = ((doc.type as PostType | undefined) ?? 'post') as PostType;
        if (type !== 'post') {
          return null;
        }

        const statusRaw = typeof doc.status === 'string' ? doc.status.toLowerCase() : 'draft';
        if (statusRaw !== 'published') {
          return null;
        }

        // Resolve categories from categoryIds
        const categoryIds = Array.isArray(doc.categoryIds) ? doc.categoryIds : [];
        const categories = categoryIds
          .map((id) => categoriesMap.get(id))
          .filter((cat): cat is Category => cat !== undefined);

        return {
          id: doc.id,
          type,
          title: doc.title || 'Untitled',
          slug: doc.slug || doc.id,
          content: doc.content || '',
          excerpt: doc.excerpt || '',
          status: (doc.status as PostStatus) || 'draft',
          featuredImage: doc.featuredImage,
          authorId: doc.authorId || 'unknown',
          authorName: doc.authorName || 'Unknown',
          categoryIds,
          categories,
          tagIds: Array.isArray(doc.tagIds) ? doc.tagIds : [],
          tags: doc.tags,
          publishedAt: doc.publishedAt?.toDate?.() || null,
          createdAt: doc.createdAt?.toDate?.() || new Date(),
          updatedAt: doc.updatedAt?.toDate?.() || new Date(),
          viewCount: doc.viewCount || 0,
          commentCount: doc.commentCount || 0,
          allowComments: doc.allowComments !== false,
          seo: doc.seo,
          locale: doc.locale,
        };
      })
      .filter((post): post is Post => post !== null);
  }, [postsData, categoriesMap]);

  const categories: Category[] = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((doc) => ({
      id: doc.id,
      name: doc.name || 'Untitled',
      slug: doc.slug || doc.id,
      description: doc.description,
      count: doc.count || 0,
      createdAt: doc.createdAt?.toDate?.() || new Date(),
    }));
  }, [categoriesData]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.authorName?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((post) => post.categoryIds?.includes(selectedCategory));
    }

    return filtered;
  }, [posts, searchQuery, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data */}
      <WebSiteStructuredData
        name={process.env.NEXT_PUBLIC_SITE_NAME || 'Tour Insights Hub'}
        url={baseUrl}
        description="Discover travel stories, tour guides, and insights from travelers around the world"
      />

      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Breadcrumb items={[{label: 'Blog'}]} className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">Blog</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Explore travel stories, guides, and insights from our community of travelers
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}
              >
                All Posts
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setCurrentPage(1);
                  }}
                >
                  {category.name}
                  {category.count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {category.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {postsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading posts...</span>
          </div>
        )}

        {/* Posts Grid */}
        {!postsLoading && paginatedPosts.length > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {paginatedPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                    {/* Featured Image */}
                    {post.featuredImage?.url && (
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        <img
                          src={post.featuredImage.url}
                          alt={post.featuredImage.altText || post.title}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <CardHeader>
                      {/* Categories */}
                      {post.categories && post.categories.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {post.categories.slice(0, 2).map((cat) => (
                            <Badge key={cat.id} variant="secondary" className="text-xs">
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <h2 className="text-xl font-semibold line-clamp-2 hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                    </CardHeader>

                    <CardContent>
                      {post.excerpt && (
                        <p className="text-muted-foreground line-clamp-3 text-sm">{post.excerpt}</p>
                      )}
                    </CardContent>

                    <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{post.authorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <time dateTime={post.createdAt.toISOString()}>
                          {format(post.publishedAt || post.createdAt, 'MMM d, yyyy')}
                        </time>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!postsLoading && paginatedPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-muted-foreground max-w-md">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'No blog posts have been published yet. Check back soon!'}
            </p>
            {(searchQuery || selectedCategory) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
