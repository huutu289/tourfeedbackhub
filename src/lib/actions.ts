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
  HeroSlide,
} from './types';
import {
  siteSettings as fallbackSiteSettings,
  tourTypes as fallbackTourTypes,
  tours as fallbackTours,
  stories as fallbackStories,
  reviews as fallbackReviews,
  heroSlides as fallbackHeroSlides,
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

function toOptionalDate(value: any): Date | null {
  if (!value) return null;
  if (value.toDate) {
    const result = value.toDate();
    return result instanceof Date && !Number.isNaN(result.getTime()) ? result : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapSiteSettings(data: any): SiteSettings {
  const base = {
    ...fallbackSiteSettings,
    contact: { ...fallbackSiteSettings.contact },
    social: { ...fallbackSiteSettings.social },
    values: Array.isArray(fallbackSiteSettings.values) ? [...fallbackSiteSettings.values] : [],
    languages: Array.isArray(fallbackSiteSettings.languages) ? [...fallbackSiteSettings.languages] : [],
  };

  if (!data) {
    return base;
  }

  return {
    siteName: typeof data.siteName === "string" && data.siteName.trim() ? data.siteName : base.siteName,
    logoUrlLight: typeof data.logoUrlLight === "string" ? data.logoUrlLight : base.logoUrlLight,
    logoUrlDark: typeof data.logoUrlDark === "string" ? data.logoUrlDark : base.logoUrlDark,
    heroTitle: typeof data.heroTitle === "string" ? data.heroTitle : base.heroTitle,
    heroSubtitle: typeof data.heroSubtitle === "string" ? data.heroSubtitle : base.heroSubtitle,
    heroCtaLabel: typeof data.heroCtaLabel === "string" ? data.heroCtaLabel : base.heroCtaLabel,
    heroMediaUrl: typeof data.heroMediaUrl === "string" ? data.heroMediaUrl : base.heroMediaUrl,
    aboutTitle: typeof data.aboutTitle === "string" ? data.aboutTitle : base.aboutTitle,
    aboutDescription:
      typeof data.aboutDescription === "string" ? data.aboutDescription : base.aboutDescription,
    missionStatement: typeof data.missionStatement === "string" ? data.missionStatement : base.missionStatement,
    values: Array.isArray(data.values)
      ? data.values.filter((value: unknown) => typeof value === "string")
      : base.values,
    contact: {
      ...base.contact,
      ...(typeof data.contact === "object" && data.contact !== null ? data.contact : {}),
    },
    social: {
      ...base.social,
      ...(typeof data.social === "object" && data.social !== null ? data.social : {}),
    },
    copyright: typeof data.copyright === "string" ? data.copyright : base.copyright,
    languages: Array.isArray(data.languages)
      ? data.languages.filter((value: unknown) => typeof value === "string")
      : base.languages,
    defaultLanguage:
      typeof data.defaultLanguage === "string" ? data.defaultLanguage : base.defaultLanguage,
    primaryColor: typeof data.primaryColor === "string" ? data.primaryColor : base.primaryColor,
    accentColor: typeof data.accentColor === "string" ? data.accentColor : base.accentColor,
  };
}

function mapDoc(doc: any): any {
  return {id: doc.id, ...doc.data()};
}

function mapSlide(doc: any): HeroSlide {
  return {
    id: doc.id,
    locale: String(doc.locale ?? 'en').toLowerCase(),
    title: doc.title ?? 'Untitled slide',
    subtitle: doc.subtitle ?? undefined,
    buttonText: doc.buttonText ?? 'Learn more',
    buttonLink: doc.buttonLink ?? '/',
    imageUrl: doc.imageUrl ?? '',
    order: typeof doc.order === 'number' ? doc.order : Number(doc.order) || 0,
    active: doc.active !== false,
    status: doc.status === 'published' ? 'published' : 'draft',
    overlayOpacity: typeof doc.overlayOpacity === 'number' ? doc.overlayOpacity : null,
    alt: typeof doc.alt === 'string' ? doc.alt : null,
    startAt: toOptionalDate(doc.startAt),
    endAt: toOptionalDate(doc.endAt),
    updatedBy: typeof doc.updatedBy === 'string' ? doc.updatedBy : null,
    updatedAt: toOptionalDate(doc.updatedAt),
  };
}

function isSlideLive(slide: HeroSlide, reference: Date): boolean {
  if (!slide.active || slide.status !== 'published') return false;
  if (!slide.imageUrl || !slide.title) return false;
  if (slide.startAt && slide.startAt > reference) return false;
  if (slide.endAt && slide.endAt < reference) return false;
  return true;
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
  const collectionRef = db.collection('siteSettings');
  const defaultDoc = await collectionRef.doc('default').get();
  if (defaultDoc.exists) {
    return mapSiteSettings(defaultDoc.data());
  }
  const legacyDoc = await collectionRef.doc('public').get();
  return mapSiteSettings(legacyDoc.exists ? legacyDoc.data() : undefined);
}

export const getPublicContent = cache(async (): Promise<PublicContent> => {
  try {
    const [siteSettings, tourTypesData, toursData, storiesData, reviewsData, slidesData] =
      await Promise.all([
        fetchSiteSettings(),
        fetchCollection('tourTypes'),
        fetchCollection('tours'),
        fetchCollection('stories'),
        fetchCollection('reviews'),
        fetchCollection('siteContentSlides'),
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

    const now = new Date();
    const slidesRaw = (slidesData as any[]).map(mapSlide);
    const slides = slidesRaw
      .filter(slide => isSlideLive(slide, now))
      .sort((a, b) => (a.order === b.order ? a.title.localeCompare(b.title) : a.order - b.order));

    return {
      siteSettings,
      tourTypes:
        tourTypesData.length > 0
          ? (tourTypesData as TourType[])
          : fallbackTourTypes,
      tours: toursData.length > 0 ? (toursData as Tour[]) : fallbackTours,
      stories: stories.length > 0 ? stories : fallbackStories,
      reviews: reviews.length > 0 ? reviews : fallbackReviews,
      slides: slides.length > 0 ? slides : fallbackHeroSlides,
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
      slides: fallbackHeroSlides,
    };
  }
});
