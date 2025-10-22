import type {MetadataRoute} from 'next';
import {getPublicContent} from '@/lib/content-service';
import {getFirestore} from 'firebase-admin/firestore';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import type {Post} from '@/lib/types';

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

async function getPosts(): Promise<Post[]> {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) return [];

    const db = getFirestore(adminApp);
    const snapshot = await db.collection('posts')
      .where('status', '==', 'published')
      .where('type', '==', 'post')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || null,
    })) as Post[];
  } catch (error) {
    console.error('Error fetching posts for sitemap:', error);
    return [];
  }
}

async function getPages(): Promise<Post[]> {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) return [];

    const db = getFirestore(adminApp);
    const snapshot = await db.collection('posts')
      .where('type', '==', 'page')
      .where('status', '==', 'published')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || null,
    })) as Post[];
  } catch (error) {
    console.error('Error fetching pages for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

  // Get dynamic content
  const [publicContent, posts, pages] = await Promise.all([
    getPublicContent(),
    getPosts(),
    getPages(),
  ]);

  // Static pages with SEO priorities
  const staticRoutes: MetadataRoute.Sitemap = [
    {url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1},
    {url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8},
    {url: `${baseUrl}/tour-types`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7},
    {url: `${baseUrl}/tours`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9},
    {url: `${baseUrl}/stories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8},
    {url: `${baseUrl}/reviews`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9},
    {url: `${baseUrl}/feedback`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7},
    {url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6},
  ];

  // Blog posts
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Custom pages
  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Tours
  const tourEntries: MetadataRoute.Sitemap = publicContent.tours.map((tour) => ({
    url: `${baseUrl}/tours/${tour.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Stories
  const storyEntries: MetadataRoute.Sitemap = publicContent.stories.map((story) => ({
    url: `${baseUrl}/stories/${story.id}`,
    lastModified: story.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postEntries, ...pageEntries, ...tourEntries, ...storyEntries];
}
