import Head from 'next/head';
import type {SEOMetadata} from '@/lib/types';

interface SEOHeadProps {
  title: string;
  description?: string;
  seo?: SEOMetadata;
  url?: string;
  imageUrl?: string;
}

export function SEOHead({title, description, seo, url, imageUrl}: SEOHeadProps) {
  const metaTitle = seo?.metaTitle || title;
  const metaDescription = seo?.metaDescription || description || '';
  const ogTitle = seo?.ogTitle || metaTitle;
  const ogDescription = seo?.ogDescription || metaDescription;
  const ogImage = seo?.ogImage || imageUrl;
  const canonicalUrl = seo?.canonicalUrl || url;
  const twitterCard = seo?.twitterCard || 'summary_large_image';
  const noindex = seo?.noindex || false;
  const nofollow = seo?.nofollow || false;

  const robots =
    noindex || nofollow ? `${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}` : undefined;

  return (
    <Head>
      <title>{metaTitle}</title>
      {metaDescription && <meta name="description" content={metaDescription} />}
      {seo?.focusKeyword && <meta name="keywords" content={seo.focusKeyword} />}
      {robots && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      {ogDescription && <meta property="og:description" content={ogDescription} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {url && <meta property="og:url" content={url} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle} />
      {ogDescription && <meta name="twitter:description" content={ogDescription} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Head>
  );
}
