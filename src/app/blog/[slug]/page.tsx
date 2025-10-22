'use client';

import {useEffect, useMemo, useState} from 'react'
import {useParams, useSearchParams} from 'next/navigation';
import {doc, getDoc} from 'firebase/firestore';
import {useFirestore, useUser} from '@/firebase/provider';
import {useDoc} from '@/firebase/firestore/use-doc';
import type {Post} from '@/lib/types';
import {format} from 'date-fns';
import {Badge} from '@/components/ui/badge';
import {Loader2, Calendar, User, Eye, ShieldAlert} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Breadcrumb} from '@/components/breadcrumb';
import {ArticleStructuredData, BreadcrumbStructuredData} from '@/components/structured-data';

export default function BlogPostPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const {user} = useUser();
  const slug = params.slug as string;

  // Check if preview mode
  const isPreview = searchParams.get('preview') === 'true';
  const previewId = searchParams.get('id');
  const previewToken = searchParams.get('token');

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(isPreview);

  const postRef = useMemo(() => {
    if (isPreview && previewId) {
      return doc(firestore, 'posts', previewId);
    }
    // For published posts, we'd need a query by slug
    // For now, using ID as slug
    return doc(firestore, 'posts', slug);
  }, [firestore, slug, isPreview, previewId]);

  const {data, isLoading} = useDoc(postRef);

  const post: Post | null = useMemo(() => {
    if (!data) return null;
    return {
      id: data.id,
      type: data.type ?? 'post',
      title: data.title ?? 'Untitled post',
      slug: data.slug ?? data.id,
      content: data.content ?? '',
      excerpt: data.excerpt ?? '',
      status: data.status ?? 'draft',
      featuredImageId: data.featuredImageId,
      featuredImage: data.featuredImage,
      authorId: data.authorId ?? 'unknown',
      authorName: data.authorName ?? 'Unknown',
      categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [],
      categories: data.categories,
      tagIds: Array.isArray(data.tagIds) ? data.tagIds : [],
      tags: data.tags,
      publishedAt: data.publishedAt?.toDate?.() ?? undefined,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      viewCount: data.viewCount ?? 0,
      commentCount: data.commentCount ?? 0,
      allowComments: data.allowComments !== false,
      seo: data.seo,
    };
  }, [data]);

  // Verify preview token
  useEffect(() => {
    const verifyToken = async () => {
      if (!isPreview) {
        setVerifyingToken(false);
        setTokenValid(true);
        return;
      }

      if (!previewToken || !previewId) {
        setTokenValid(false);
        setVerifyingToken(false);
        return;
      }

      try {
        const response = await fetch('/api/preview/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({token: previewToken, postId: previewId}),
        });

        const result = await response.json();
        setTokenValid(result.valid === true);
      } catch (error) {
        console.error('Token verification error:', error);
        setTokenValid(false);
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [isPreview, previewToken, previewId]);

  // Update view count (only for non-preview, published posts)
  useEffect(() => {
    if (!isPreview && post && post.status === 'published') {
      // We could increment view count here
      // For now, skip to avoid unnecessary writes
    }
  }, [post, isPreview]);

  // Add noindex meta tag for preview/draft pages
  useEffect(() => {
    if (isPreview || (post && post.status !== 'published')) {
      const metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      metaRobots.content = 'noindex, nofollow';
      document.head.appendChild(metaRobots);

      return () => {
        document.head.removeChild(metaRobots);
      };
    }
  }, [isPreview, post]);

  if (verifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (isPreview && tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Invalid or expired preview token. Please request a new preview link from the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Post Not Found</AlertTitle>
          <AlertDescription>The post you're looking for doesn't exist or has been removed.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show preview warning if in preview mode
  const showPreviewWarning = isPreview || post.status !== 'published';

  // Generate full URL for structured data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
  const postUrl = `${baseUrl}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      {!isPreview && post.status === 'published' && (
        <>
          <ArticleStructuredData post={post} url={postUrl} />
          <BreadcrumbStructuredData
            items={[
              {name: 'Blog', url: '/blog'},
              {name: post.title},
            ]}
          />
        </>
      )}

      {showPreviewWarning && (
        <div className="bg-amber-500 text-white py-3 px-4 text-center font-medium">
          Preview Mode: This post is not yet published
        </div>
      )}

      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            {label: 'Blog', href: '/blog'},
            {label: post.title},
          ]}
          className="mb-6"
        />

        {/* Header */}
        <header className="mb-8">
          {post.categories && post.categories.length > 0 && (
            <div className="flex gap-2 mb-4">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary">
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">{post.title}</h1>

          {post.excerpt && <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.createdAt.toISOString()}>
                {format(post.publishedAt ?? post.createdAt, 'MMMM d, yyyy')}
              </time>
            </div>
            {post.viewCount !== undefined && post.viewCount > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{post.viewCount} views</span>
              </div>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage?.url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.altText || post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{__html: post.content}}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">TAGS</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
