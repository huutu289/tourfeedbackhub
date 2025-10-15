import { cache } from "react";
import { initializeFirebaseAdmin } from "@/firebase/admin";
import {
  siteSettings as fallbackSiteSettings,
  tourTypes as fallbackTourTypes,
  tours as fallbackTours,
  stories as fallbackStories,
  reviews as fallbackReviews,
} from "@/lib/data";
import type { PublicContent, Review, SiteSettings, Story, Tour, TourType } from "@/lib/types";

interface FirestoreDocument {
  id: string;
  data: FirebaseFirestore.DocumentData;
}

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (typeof value === "number") return new Date(value);
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date();
}

function mapSiteSettings(data: FirebaseFirestore.DocumentData | undefined): SiteSettings {
  if (!data) {
    return fallbackSiteSettings;
  }

  return {
    heroTitle: data.heroTitle ?? fallbackSiteSettings.heroTitle,
    heroSubtitle: data.heroSubtitle ?? fallbackSiteSettings.heroSubtitle,
    heroCtaLabel: data.heroCtaLabel ?? fallbackSiteSettings.heroCtaLabel,
    heroMediaUrl: data.heroMediaUrl ?? fallbackSiteSettings.heroMediaUrl,
    aboutTitle: data.aboutTitle ?? fallbackSiteSettings.aboutTitle,
    aboutDescription: data.aboutDescription ?? fallbackSiteSettings.aboutDescription,
    missionStatement: data.missionStatement ?? fallbackSiteSettings.missionStatement,
    values: Array.isArray(data.values) ? data.values : fallbackSiteSettings.values,
    contact: {
      ...fallbackSiteSettings.contact,
      ...(data.contact ?? {}),
    },
    languages: Array.isArray(data.languages) ? data.languages : fallbackSiteSettings.languages,
    defaultLanguage: data.defaultLanguage ?? fallbackSiteSettings.defaultLanguage,
    primaryColor: data.primaryColor ?? fallbackSiteSettings.primaryColor,
    accentColor: data.accentColor ?? fallbackSiteSettings.accentColor,
  };
}

function mapTourType(doc: FirestoreDocument): TourType {
  const { data } = doc;
  return {
    id: doc.id,
    title: data.title ?? data.name ?? "Tour Type",
    description: data.description ?? "",
    icon: data.icon ?? undefined,
    order: typeof data.order === "number" ? data.order : undefined,
  };
}

function mapTour(doc: FirestoreDocument): Tour {
  const { data } = doc;
  const photoUrls = (Array.isArray(data.photoUrls)
    ? data.photoUrls
    : Array.isArray(data.mediaUrls)
      ? data.mediaUrls
      : [data.coverImageUrl ?? ""])
    .map((item: unknown) => String(item).trim())
    .filter(Boolean);
  const videoUrls = Array.isArray(data.videoUrls)
    ? data.videoUrls.map((item: unknown) => String(item).trim()).filter(Boolean)
    : [];
  const provinces = Array.isArray(data.provinces)
    ? data.provinces.map((item: unknown) => String(item).trim()).filter(Boolean)
    : [];
  const provinceIds = Array.isArray(data.provinceIds)
    ? data.provinceIds.map((item: unknown) => String(item).trim()).filter(Boolean)
    : undefined;
  const guideLanguages = Array.isArray(data.guideLanguages)
    ? data.guideLanguages.map((item: unknown) => String(item).trim()).filter(Boolean)
    : data.guideLanguage
      ? [String(data.guideLanguage).trim()].filter(Boolean)
      : [];
  const guideLanguageIds = Array.isArray(data.guideLanguageIds)
    ? data.guideLanguageIds.map((item: unknown) => String(item).trim()).filter(Boolean)
    : undefined;
  const clientNationalities = Array.isArray(data.clientNationalities)
    ? data.clientNationalities.map((item: unknown) => String(item).trim()).filter(Boolean)
    : [];
  const clientNationalityIds = Array.isArray(data.clientNationalityIds)
    ? data.clientNationalityIds.map((item: unknown) => String(item).trim()).filter(Boolean)
    : undefined;

  return {
    id: doc.id,
    code: data.code ?? data.tourCode ?? `FT-${doc.id}`,
    name: data.name ?? data.title ?? "Tour",
    summary: data.summary ?? data.description ?? "",
    startDate: toDate(data.startDate ?? data.dateStart ?? Date.now()),
    endDate: toDate(data.endDate ?? data.dateEnd ?? Date.now()),
    clientCount: typeof data.clientCount === "number" ? data.clientCount : Number(data.clientCount) || 0,
    clientNationalities,
    clientNationalityIds,
    clientCountry: data.clientCountry ?? "",
    clientCity: data.clientCity ?? "",
    provinces,
    provinceIds,
    itinerary: data.itinerary ?? "",
    photoUrls,
    videoUrls,
    tourTypeIds: Array.isArray(data.tourTypeIds) ? data.tourTypeIds : undefined,
    guideId: data.guideId ?? undefined,
    guideName: data.guideName ?? "",
    guideLanguages,
    guideLanguageIds,
    status: data.status ?? "finished",
  };
}

function mapStory(doc: FirestoreDocument): Story {
  const { data } = doc;
  return {
    id: doc.id,
    title: data.title ?? "Story",
    excerpt: data.excerpt ?? data.summary ?? "",
    coverImageUrl: data.coverImageUrl ?? data.imageUrl ?? "",
    publishedAt: toDate(data.publishedAt ?? data.createdAt ?? Date.now()),
    readTimeMinutes: typeof data.readTimeMinutes === "number" ? data.readTimeMinutes : undefined,
  };
}

function mapReview(doc: FirestoreDocument): Review {
  const { data } = doc;
  return {
    id: doc.id,
    authorDisplay: data.authorDisplay ?? data.name ?? "Anonymous", 
    country: data.country ?? "",
    language: data.language ?? "en",
    rating: typeof data.rating === "number" ? data.rating : Number(data.rating) || 0,
    message: data.message ?? "",
    tourId: data.tourId ?? undefined,
    tourName: data.tourName ?? undefined,
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : undefined,
    status: data.status ?? "approved",
    createdAt: toDate(data.createdAt ?? data.publishedAt ?? Date.now()),
    summary: data.summary ?? undefined,
  };
}

async function fetchCollection(collectionPath: string): Promise<FirestoreDocument[]> {
  const admin = initializeFirebaseAdmin();
  if (!admin) return [];
  const snapshot = await admin.firestore.collection(collectionPath).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function fetchApprovedReviews(): Promise<Review[]> {
  const admin = initializeFirebaseAdmin();
  if (!admin) return [];
  const snapshot = await admin.firestore
    .collection("reviews")
    .where("status", "==", "approved")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => mapReview({ id: doc.id, data: doc.data() }));
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const admin = initializeFirebaseAdmin();
  if (!admin) return fallbackSiteSettings;
  const docRef = admin.firestore.collection("siteSettings").doc("public");
  const snapshot = await docRef.get();
  return mapSiteSettings(snapshot.data());
}

async function fetchPublicContent(): Promise<PublicContent> {
  const [settings, tourTypeDocs, tourDocs, storyDocs, reviewDocs] = await Promise.all([
    fetchSiteSettings(),
    fetchCollection("tourTypes"),
    fetchCollection("tours"),
    fetchCollection("stories"),
    fetchApprovedReviews(),
  ]);

  const mappedTourTypes = tourTypeDocs.length ? tourTypeDocs.map(mapTourType) : fallbackTourTypes;
  const mappedTours = (tourDocs.length ? tourDocs.map(mapTour) : fallbackTours).filter(
    (tour) => tour.status === "finished"
  );
  const mappedStories = storyDocs.length ? storyDocs.map(mapStory) : fallbackStories;
  const mappedReviews = reviewDocs.length ? reviewDocs : fallbackReviews;

  return {
    siteSettings: settings,
    tourTypes: mappedTourTypes,
    tours: mappedTours,
    stories: mappedStories,
    reviews: mappedReviews,
  };
}

export const getPublicContent = cache(async (): Promise<PublicContent> => {
  try {
    return await fetchPublicContent();
  } catch (error) {
    console.warn("Falling back to local content because Firestore could not be reached", error);
    return {
      siteSettings: fallbackSiteSettings,
      tourTypes: fallbackTourTypes,
      tours: fallbackTours,
      stories: fallbackStories,
      reviews: fallbackReviews.filter((review) => review.status === "approved"),
    };
  }
});

export const getSiteSettings = cache(async () => {
  try {
    return await fetchSiteSettings();
  } catch (error) {
    console.warn("Falling back to local site settings", error);
    return fallbackSiteSettings;
  }
});
