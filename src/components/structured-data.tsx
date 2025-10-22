/**
 * JSON-LD Structured Data Components for SEO
 * Helps search engines understand content better
 */

import Script from 'next/script';
import type {Post, Category, Tag} from '@/lib/types';

interface ArticleStructuredDataProps {
  post: Post;
  url: string;
}

export function ArticleStructuredData({post, url}: ArticleStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.featuredImage?.url || '',
    datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: post.authorName || 'Unknown',
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'Tour Insights Hub',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(post.categories && post.categories.length > 0 && {
      articleSection: post.categories.map((cat) => cat.name),
    }),
    ...(post.tags && post.tags.length > 0 && {
      keywords: post.tags.map((tag) => tag.name).join(', '),
    }),
  };

  return (
    <Script
      id="article-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
    />
  );
}

interface BreadcrumbStructuredDataProps {
  items: Array<{name: string; url?: string}>;
}

export function BreadcrumbStructuredData({items}: BreadcrumbStructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        ...(item.url && {item: `${baseUrl}${item.url}`}),
      })),
    ],
  };

  return (
    <Script
      id="breadcrumb-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
    />
  );
}

interface ProductStructuredDataProps {
  name: string;
  description: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  url: string;
}

export function ProductStructuredData({
  name,
  description,
  image,
  rating,
  reviewCount,
  price,
  currency = 'USD',
  url,
}: ProductStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(image && {image}),
    ...(rating &&
      reviewCount && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating,
          reviewCount: reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    ...(price && {
      offers: {
        '@type': 'Offer',
        price: price,
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        url: url,
      },
    }),
  };

  return (
    <Script
      id="product-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
    />
  );
}

interface OrganizationStructuredDataProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  socialLinks?: string[];
}

export function OrganizationStructuredData({
  name,
  url,
  logo,
  description,
  socialLinks = [],
}: OrganizationStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    ...(logo && {logo}),
    ...(description && {description}),
    ...(socialLinks.length > 0 && {sameAs: socialLinks}),
  };

  return (
    <Script
      id="organization-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
    />
  );
}

interface WebSiteStructuredDataProps {
  name: string;
  url: string;
  description?: string;
}

export function WebSiteStructuredData({name, url, description}: WebSiteStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    ...(description && {description}),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Script
      id="website-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
    />
  );
}
