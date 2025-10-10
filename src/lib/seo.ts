/**
 * @file SEO utilities and metadata generation
 */

export interface SEOConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: "website" | "article";
  locale?: string;
  siteName?: string;
}

const DEFAULT_SITE_NAME = "Tour Insights Hub";
const DEFAULT_LOCALE = "en_US";
const DEFAULT_IMAGE = "/og-image.jpg"; // You'll need to add this to public/
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tourfeedbackhub.web.app";

/**
 * Generate metadata for Next.js pages
 */
export function generateMetadata(config: SEOConfig) {
  const {
    title,
    description,
    url = SITE_URL,
    image = DEFAULT_IMAGE,
    type = "website",
    locale = DEFAULT_LOCALE,
    siteName = DEFAULT_SITE_NAME,
  } = config;

  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;
  const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale,
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [fullImage],
    },
    alternates: {
      canonical: fullUrl,
    },
  };
}

/**
 * Default SEO config for home page
 */
export const homePageSEO: SEOConfig = {
  title: "Professional Tour Guide Services in Italy",
  description:
    "Discover authentic Italian experiences with our expert tour guides. Explore historic cities, hidden gems, and cultural treasures with personalized tours tailored to your interests.",
};

/**
 * SEO config for feedback page
 */
export const feedbackPageSEO: SEOConfig = {
  title: "Share Your Feedback",
  description:
    "Tell us about your tour experience. Your feedback helps us improve and helps other travelers discover amazing experiences.",
};

/**
 * SEO config for reviews page
 */
export const reviewsPageSEO: SEOConfig = {
  title: "Tour Reviews & Testimonials",
  description:
    "Read authentic reviews from travelers who experienced our tours. Discover what makes our guided tours special through the words of our guests.",
};

/**
 * SEO config for tours page
 */
export const toursPageSEO: SEOConfig = {
  title: "Available Tours",
  description:
    "Browse our selection of carefully curated tours across Italy. From ancient Rome to Renaissance Florence, find the perfect experience for your journey.",
};

/**
 * SEO config for about page
 */
export const aboutPageSEO: SEOConfig = {
  title: "About Our Tour Services",
  description:
    "Learn about our passion for sharing Italy's rich history and culture. Meet our experienced guides and discover our commitment to unforgettable experiences.",
};

/**
 * Generate JSON-LD structured data for local business
 */
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TouristInformationCenter",
    name: DEFAULT_SITE_NAME,
    description: "Professional tour guide services in Italy",
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      addressCountry: "IT",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "50", // Update with actual count
    },
    priceRange: "$$",
  };
}

/**
 * Generate JSON-LD structured data for reviews
 */
export function generateReviewSchema(review: {
  author: string;
  rating: number;
  text: string;
  date: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.text,
    datePublished: review.date,
  };
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
