'use server';

import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import type {Post, MediaItem, Category, Tag} from './types';

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

interface SearchResult {
  type: 'post' | 'page' | 'media' | 'category' | 'tag';
  id: string;
  title: string;
  excerpt?: string;
  url: string;
  matchScore: number;
}

function calculateMatchScore(searchTerms: string[], content: string): number {
  const lowerContent = content.toLowerCase();
  let score = 0;

  searchTerms.forEach(term => {
    const termLower = term.toLowerCase();

    // Exact match in title/name gets highest score
    if (lowerContent === termLower) {
      score += 100;
    }
    // Starts with term gets high score
    else if (lowerContent.startsWith(termLower)) {
      score += 80;
    }
    // Contains term gets medium score
    else if (lowerContent.includes(termLower)) {
      score += 50;
    }
    // Fuzzy match (simple version)
    else {
      const words = lowerContent.split(/\s+/);
      const matchingWords = words.filter(word => word.includes(termLower));
      score += matchingWords.length * 10;
    }
  });

  return Math.min(100, score);
}

export async function searchContent(
  query: string,
  filters?: {
    types?: Array<'post' | 'page' | 'media' | 'category' | 'tag'>;
    limit?: number;
  }
) {
  try {
    if (!query || query.trim().length < 2) {
      return {success: true, results: []};
    }

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);
    const results: SearchResult[] = [];

    const types = filters?.types || ['post', 'page', 'media', 'category', 'tag'];

    // Search Posts and Pages
    if (types.includes('post') || types.includes('page')) {
      const postsSnapshot = await db
        .collection('posts')
        .where('status', '==', 'published')
        .get();

      postsSnapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type as 'post' | 'page';

        if (!types.includes(type)) return;

        // Calculate match score
        const titleScore = calculateMatchScore(searchTerms, data.title || '');
        const excerptScore = calculateMatchScore(searchTerms, data.excerpt || '') * 0.5;
        const contentScore = calculateMatchScore(searchTerms, data.content || '') * 0.3;

        const totalScore = titleScore + excerptScore + contentScore;

        if (totalScore > 10) {
          results.push({
            type,
            id: doc.id,
            title: data.title,
            excerpt: data.excerpt,
            url: type === 'post' ? `/blog/${data.slug}` : `/${data.slug}`,
            matchScore: Math.round(totalScore),
          });
        }
      });
    }

    // Search Categories
    if (types.includes('category')) {
      const categoriesSnapshot = await db.collection('categories').get();

      categoriesSnapshot.forEach(doc => {
        const data = doc.data();

        const nameScore = calculateMatchScore(searchTerms, data.name || '');
        const descScore = calculateMatchScore(searchTerms, data.description || '') * 0.5;

        const totalScore = nameScore + descScore;

        if (totalScore > 10) {
          results.push({
            type: 'category',
            id: doc.id,
            title: data.name,
            excerpt: data.description,
            url: `/category/${data.slug}`,
            matchScore: Math.round(totalScore),
          });
        }
      });
    }

    // Search Tags
    if (types.includes('tag')) {
      const tagsSnapshot = await db.collection('tags').get();

      tagsSnapshot.forEach(doc => {
        const data = doc.data();

        const nameScore = calculateMatchScore(searchTerms, data.name || '');
        const descScore = calculateMatchScore(searchTerms, data.description || '') * 0.5;

        const totalScore = nameScore + descScore;

        if (totalScore > 10) {
          results.push({
            type: 'tag',
            id: doc.id,
            title: data.name,
            excerpt: data.description,
            url: `/tag/${data.slug}`,
            matchScore: Math.round(totalScore),
          });
        }
      });
    }

    // Search Media
    if (types.includes('media')) {
      const mediaSnapshot = await db.collection('media').get();

      mediaSnapshot.forEach(doc => {
        const data = doc.data();

        const titleScore = calculateMatchScore(searchTerms, data.title || data.fileName || '');
        const altScore = calculateMatchScore(searchTerms, data.altText || '') * 0.7;
        const captionScore = calculateMatchScore(searchTerms, data.caption || '') * 0.5;

        const totalScore = titleScore + altScore + captionScore;

        if (totalScore > 10) {
          results.push({
            type: 'media',
            id: doc.id,
            title: data.title || data.fileName,
            excerpt: data.caption || data.description,
            url: data.url,
            matchScore: Math.round(totalScore),
          });
        }
      });
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Apply limit
    const limitedResults = filters?.limit ? results.slice(0, filters.limit) : results;

    return {
      success: true,
      results: limitedResults,
      total: results.length,
    };
  } catch (error: any) {
    console.error('Error searching content:', error);
    return {success: false, error: error.message, results: []};
  }
}

// Advanced search with more filters
export async function advancedSearch(params: {
  query: string;
  types?: Array<'post' | 'page' | 'media' | 'category' | 'tag'>;
  categoryIds?: string[];
  tagIds?: string[];
  dateRange?: {start: Date; end: Date};
  authorId?: string;
  sortBy?: 'relevance' | 'date-desc' | 'date-asc' | 'title';
  limit?: number;
}) {
  try {
    const basicResults = await searchContent(params.query, {
      types: params.types,
      limit: params.limit ? params.limit * 2 : undefined, // Get more for filtering
    });

    if (!basicResults.success) {
      return basicResults;
    }

    let results = basicResults.results;

    // Apply additional filters for posts/pages
    if (params.categoryIds || params.tagIds || params.dateRange || params.authorId) {
      const adminApp = getAdminApp();
      const db = getFirestore(adminApp);

      results = await Promise.all(
        results.map(async result => {
          if (result.type !== 'post' && result.type !== 'page') {
            return result;
          }

          const postDoc = await db.collection('posts').doc(result.id).get();
          const postData = postDoc.data();

          if (!postData) return null;

          // Filter by categories
          if (params.categoryIds && params.categoryIds.length > 0) {
            const postCategories = postData.categoryIds || [];
            const hasCategory = params.categoryIds.some(cat => postCategories.includes(cat));
            if (!hasCategory) return null;
          }

          // Filter by tags
          if (params.tagIds && params.tagIds.length > 0) {
            const postTags = postData.tagIds || [];
            const hasTag = params.tagIds.some(tag => postTags.includes(tag));
            if (!hasTag) return null;
          }

          // Filter by date range
          if (params.dateRange) {
            const postDate = postData.publishedAt?.toDate() || postData.createdAt?.toDate();
            if (!postDate) return null;

            if (postDate < params.dateRange.start || postDate > params.dateRange.end) {
              return null;
            }
          }

          // Filter by author
          if (params.authorId && postData.authorId !== params.authorId) {
            return null;
          }

          return result;
        })
      ).then(results => results.filter(r => r !== null) as SearchResult[]);
    }

    // Apply sorting
    if (params.sortBy && params.sortBy !== 'relevance') {
      const adminApp = getAdminApp();
      const db = getFirestore(adminApp);

      const resultsWithData = await Promise.all(
        results.map(async result => {
          if (result.type === 'post' || result.type === 'page') {
            const postDoc = await db.collection('posts').doc(result.id).get();
            const postData = postDoc.data();
            return {...result, _data: postData};
          }
          return {...result, _data: null};
        })
      );

      if (params.sortBy === 'date-desc') {
        resultsWithData.sort((a, b) => {
          const dateA =
            a._data?.publishedAt?.toDate() || a._data?.createdAt?.toDate() || new Date(0);
          const dateB =
            b._data?.publishedAt?.toDate() || b._data?.createdAt?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      } else if (params.sortBy === 'date-asc') {
        resultsWithData.sort((a, b) => {
          const dateA =
            a._data?.publishedAt?.toDate() || a._data?.createdAt?.toDate() || new Date(0);
          const dateB =
            b._data?.publishedAt?.toDate() || b._data?.createdAt?.toDate() || new Date(0);
          return dateA.getTime() - dateB.getTime();
        });
      } else if (params.sortBy === 'title') {
        resultsWithData.sort((a, b) => a.title.localeCompare(b.title));
      }

      results = resultsWithData.map(({_data, ...result}) => result);
    }

    // Apply final limit
    const finalResults = params.limit ? results.slice(0, params.limit) : results;

    return {
      success: true,
      results: finalResults,
      total: results.length,
    };
  } catch (error: any) {
    console.error('Error in advanced search:', error);
    return {success: false, error: error.message, results: []};
  }
}
