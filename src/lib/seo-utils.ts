import type {Metadata} from 'next';
import type {SEOMetadata} from './types';

interface GenerateMetadataProps {
  title: string;
  description?: string;
  seo?: SEOMetadata;
  url?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
  publishedTime?: Date;
  modifiedTime?: Date;
  authors?: string[];
  tags?: string[];
}

export function generateMetadata({
  title,
  description,
  seo,
  url,
  imageUrl,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  tags,
}: GenerateMetadataProps): Metadata {
  const metaTitle = seo?.metaTitle || title;
  const metaDescription = seo?.metaDescription || description || '';
  const ogTitle = seo?.ogTitle || metaTitle;
  const ogDescription = seo?.ogDescription || metaDescription;
  const ogImage = seo?.ogImage || imageUrl;
  const canonicalUrl = seo?.canonicalUrl || url;
  const noindex = seo?.noindex || false;
  const nofollow = seo?.nofollow || false;

  const metadata: Metadata = {
    title: metaTitle,
    description: metaDescription,
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    ...(noindex || nofollow
      ? {
          robots: {
            index: !noindex,
            follow: !nofollow,
          },
        }
      : {}),
    ...(seo?.focusKeyword && {keywords: seo.focusKeyword.split(',').map((k) => k.trim())}),
    openGraph: {
      type,
      title: ogTitle,
      description: ogDescription,
      ...(ogImage && {images: [{url: ogImage}]}),
      ...(url && {url}),
      ...(type === 'article' &&
        publishedTime && {
          publishedTime: publishedTime.toISOString(),
        }),
      ...(type === 'article' &&
        modifiedTime && {
          modifiedTime: modifiedTime.toISOString(),
        }),
      ...(type === 'article' && authors && {authors}),
      ...(type === 'article' && tags && {tags}),
    },
    twitter: {
      card: seo?.twitterCard || 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      ...(ogImage && {images: [ogImage]}),
    },
  };

  return metadata;
}
