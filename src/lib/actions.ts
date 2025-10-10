'use server';

import {addDoc, collection} from 'firebase/firestore';
import {getSdks, initializeFirebase} from '@/firebase';
import {z} from 'zod';
import type {
  Tour,
  Review,
  SiteSettings,
  TourType,
  Story,
  PublicContent,
} from './types';
import {
  siteSettings as fallbackSiteSettings,
  tourTypes as fallbackTourTypes,
  tours as fallbackTours,
  stories as fallbackStories,
  reviews as fallbackReviews,
} from './data';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {cache} from 'react';

const feedbackSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  country: z.string().min(1, 'Please select your country.'),
  language: z.string().min(1, 'Please select your language.'),
  rating: z.number().min(1, 'Please provide a rating.').max(5),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters.')
    .max(1000, 'Message must be 1000 characters or less.'),
  tourId: z.string().optional(),
});

export async function submitFeedback(formData: FormData) {
  try {
    const validatedFields = feedbackSchema.safeParse({
      name: formData.get('name'),
      country: formData.get('country'),
      language: formData.get('language'),
      rating: Number(formData.get('rating')),
      message: formData.get('message'),
      tourId: formData.get('tourId'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Validation failed.',
      };
    }

    const {firestore} = getSdks(initializeFirebase().firebaseApp);
    await addDoc(collection(firestore, 'feedback'), {
      ...validatedFields.data,
      status: 'pending',
      submittedAt: new Date(),
    });

    return {
      message: 'Feedback submitted successfully.',
    };
  } catch (e: any) {
    return {
      message: 'An unexpected error occurred.',
    };
  }
}

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

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value.toDate) return value.toDate();
  return new Date(value);
}

function mapSiteSettings(data: any): SiteSettings {
  return {
    heroTitle: data.heroTitle ?? fallbackSiteSettings.heroTitle,
    heroSubtitle: data.heroSubtitle ?? fallbackSiteSettings.heroSubtitle,
    heroCtaLabel: data.heroCtaLabel ?? fallbackSiteSettings.heroCtaLabel,
    heroMediaUrl: data.heroMediaUrl ?? fallbackSiteSettings.heroMediaUrl,
    aboutTitle: data.aboutTitle ?? fallbackSiteSettings.aboutTitle,
    aboutDescription:
      data.aboutDescription ?? fallbackSiteSettings.aboutDescription,
    missionStatement:
      data.missionStatement ?? fallbackSiteSettings.missionStatement,
    values: data.values ?? fallbackSiteSettings.values,
    contact: {
      ...fallbackSiteSettings.contact,
      ...(data.contact ?? {}),
    },
    languages: data.languages ?? fallbackSiteSettings.languages,
    defaultLanguage:
      data.defaultLanguage ?? fallbackSiteSettings.defaultLanguage,
    primaryColor: data.primaryColor ?? fallbackSiteSettings.primaryColor,
    accentColor: data.accentColor ?? fallbackSiteSettings.accentColor,
  };
}

function mapDoc(doc: any): any {
  return {id: doc.id, ...doc.data()};
}

async function fetchCollection(collectionName: string) {
  const adminApp = getAdminApp();
  if (!adminApp) return [];
  const db = getFirestore(adminApp);
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map(mapDoc);
}

async function fetchSiteSettings() {
  const adminApp = getAdminApp();
  if (!adminApp) return fallbackSiteSettings;
  const db = getFirestore(adminApp);
  const doc = await db.collection('siteSettings').doc('public').get();
  return mapSiteSettings(doc.data());
}

export const getPublicContent = cache(async (): Promise<PublicContent> => {
  try {
    const [siteSettings, tourTypesData, toursData, storiesData, reviewsData] =
      await Promise.all([
        fetchSiteSettings(),
        fetchCollection('tourTypes'),
        fetchCollection('tours'),
        fetchCollection('stories'),
        fetchCollection('reviews'),
      ]);

    const reviews = (reviewsData as any[])
      .map(
        (r: any): Review => ({
          ...r,
          status: r.status ?? 'approved',
          createdAt: toDate(r.createdAt),
        })
      )
      .filter(r => r.status === 'approved');

    const stories = (storiesData as any[]).map(
      (s: any): Story => ({
        ...s,
        publishedAt: toDate(s.publishedAt),
      })
    );

    return {
      siteSettings,
      tourTypes:
        tourTypesData.length > 0
          ? (tourTypesData as TourType[])
          : fallbackTourTypes,
      tours: toursData.length > 0 ? (toursData as Tour[]) : fallbackTours,
      stories: stories.length > 0 ? stories : fallbackStories,
      reviews: reviews.length > 0 ? reviews : fallbackReviews,
    };
  } catch (error) {
    console.warn(
      'Falling back to local content because Firestore could not be reached',
      error
    );
    return {
      siteSettings: fallbackSiteSettings,
      tourTypes: fallbackTourTypes,
      tours: fallbackTours,
      stories: fallbackStories,
      reviews: fallbackReviews.filter(r => r.status === 'approved'),
    };
  }
});
