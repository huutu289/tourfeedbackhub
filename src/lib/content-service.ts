import { cache } from "react";
import { initializeFirebaseAdmin } from "@/firebase/admin";
import { siteSettings as fallbackSiteSettings } from "@/lib/data";
import type {
  PublicContent,
  Review,
  SiteSettings,
  Story,
  Tour,
  TourType,
  HeroSlide,
  Post,
  PostStatus,
  PostType,
} from "@/lib/types";

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

function toOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    const result = value.toDate();
    return result instanceof Date && !Number.isNaN(result.getTime()) ? result : null;
  }
  return null;
}

function mapSiteSettings(data: FirebaseFirestore.DocumentData | undefined): SiteSettings {
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
    aboutDescription: typeof data.aboutDescription === "string" ? data.aboutDescription : base.aboutDescription,
    missionStatement: typeof data.missionStatement === "string" ? data.missionStatement : base.missionStatement,
    values: Array.isArray(data.values) ? data.values.filter((value: unknown) => typeof value === "string") : base.values,
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
    defaultLanguage: typeof data.defaultLanguage === "string" ? data.defaultLanguage : base.defaultLanguage,
    primaryColor: typeof data.primaryColor === "string" ? data.primaryColor : base.primaryColor,
    accentColor: typeof data.accentColor === "string" ? data.accentColor : base.accentColor,
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
    reviewType: typeof data.reviewType === "string" ? data.reviewType : undefined,
  };
}

function mapPost(doc: FirestoreDocument): Post {
  const { data } = doc;
  const rawStatus = typeof data.status === "string" ? data.status.toLowerCase() : "draft";
  const allowedStatuses: PostStatus[] = ["draft", "published", "scheduled", "private", "trash"];
  const status: PostStatus = allowedStatuses.includes(rawStatus as PostStatus)
    ? (rawStatus as PostStatus)
    : "draft";

  const rawType = typeof data.type === "string" ? data.type.toLowerCase() : "post";
  const type: PostType = rawType === "page" ? "page" : "post";

  const categoryIds = Array.isArray(data.categoryIds)
    ? data.categoryIds.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const tagIds = Array.isArray(data.tagIds)
    ? data.tagIds.filter((value: unknown): value is string => typeof value === "string")
    : [];

  return {
    id: doc.id,
    type,
    title: typeof data.title === "string" ? data.title : "Untitled",
    slug: typeof data.slug === "string" && data.slug.trim() ? data.slug : doc.id,
    content: typeof data.content === "string" ? data.content : "",
    excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
    status,
    featuredImageId: typeof data.featuredImageId === "string" ? data.featuredImageId : undefined,
    featuredImage: typeof data.featuredImage === "object" ? data.featuredImage : undefined,
    authorId: typeof data.authorId === "string" ? data.authorId : "unknown",
    authorName: typeof data.authorName === "string" ? data.authorName : "Unknown",
    categoryIds,
    tagIds,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    publishedAt: toOptionalDate(data.publishedAt ?? data.createdAt) ?? null,
    scheduledFor: toOptionalDate(data.scheduledFor),
    createdAt: toDate(data.createdAt ?? data.publishedAt ?? Date.now()),
    updatedAt: toDate(data.updatedAt ?? data.createdAt ?? Date.now()),
    viewCount: typeof data.viewCount === "number" ? data.viewCount : Number(data.viewCount) || 0,
    commentCount:
      typeof data.commentCount === "number" ? data.commentCount : Number(data.commentCount) || 0,
    allowComments: data.allowComments !== false,
    seo: typeof data.seo === "object" ? data.seo : undefined,
    locale: typeof data.locale === "string" ? data.locale : undefined,
  };
}

function mapSlide(doc: FirestoreDocument): HeroSlide {
  const { data } = doc;
  return {
    id: doc.id,
    locale: String(data.locale ?? "en").toLowerCase(),
    title: data.title ?? "Untitled slide",
    subtitle: data.subtitle ?? undefined,
    buttonText: data.buttonText ?? "Learn more",
    buttonLink: data.buttonLink ?? "/",
    imageUrl: data.imageUrl ?? "",
    order: typeof data.order === "number" ? data.order : Number(data.order) || 0,
    active: data.active !== false,
    status: data.status === "published" ? "published" : "draft",
    overlayOpacity: typeof data.overlayOpacity === "number" ? data.overlayOpacity : null,
    alt: typeof data.alt === "string" ? data.alt : null,
    startAt: toOptionalDate(data.startAt),
    endAt: toOptionalDate(data.endAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    updatedAt: toOptionalDate(data.updatedAt),
  };
}

function isSlideLive(slide: HeroSlide, reference: Date): boolean {
  if (!slide.active || slide.status !== "published") {
    return false;
  }
  if (!slide.imageUrl || !slide.title) {
    return false;
  }
  if (slide.startAt && slide.startAt > reference) {
    return false;
  }
  if (slide.endAt && slide.endAt < reference) {
    return false;
  }
  return true;
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

async function fetchPublishedPosts(): Promise<FirestoreDocument[]> {
  const admin = initializeFirebaseAdmin();
  if (!admin) return [];
  const snapshot = await admin.firestore
    .collection("posts")
    .orderBy("publishedAt", "desc")
    .limit(6)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const admin = initializeFirebaseAdmin();
  if (!admin) return fallbackSiteSettings;
  const collectionRef = admin.firestore.collection("siteSettings");
  const defaultDoc = await collectionRef.doc("default").get();
  if (defaultDoc.exists) {
    return mapSiteSettings(defaultDoc.data());
  }
  const legacyDoc = await collectionRef.doc("public").get();
  return mapSiteSettings(legacyDoc.exists ? legacyDoc.data() : undefined);
}

async function fetchPublicContent(): Promise<PublicContent> {
  const [settings, tourTypeDocs, tourDocs, storyDocs, reviewDocs, slideDocs, publishedPosts] =
    await Promise.all([
      fetchSiteSettings(),
      fetchCollection("tourTypes"),
      fetchCollection("tours"),
      fetchCollection("stories"),
      fetchApprovedReviews(),
      fetchCollection("siteContentSlides"),
      fetchPublishedPosts(),
    ]);

  const mappedTourTypes = tourTypeDocs.map(mapTourType);
  const mappedTours = tourDocs.map(mapTour).filter((tour) => tour.status === "finished");
  const mappedStories = storyDocs.map(mapStory);
  const mappedReviews = reviewDocs;
  const mappedPosts = publishedPosts
    .map(mapPost)
    .filter((post) => post.type === "post" && post.status === "published");
  const now = new Date();
  const mappedSlidesRaw = slideDocs.map(mapSlide);
  const mappedSlides = mappedSlidesRaw
    .filter((slide) => isSlideLive(slide, now))
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.title.localeCompare(b.title);
      }
      return a.order - b.order;
    });
  const slides = mappedSlides;

  return {
    siteSettings: settings,
    tourTypes: mappedTourTypes,
    tours: mappedTours,
    stories: mappedStories,
    reviews: mappedReviews,
    slides,
    posts: mappedPosts,
  };
}

export const getPublicContent = cache(async (): Promise<PublicContent> => {
  try {
    return await fetchPublicContent();
  } catch (error) {
    console.warn("Falling back to local content because Firestore could not be reached", error);
    return {
      siteSettings: fallbackSiteSettings,
      tourTypes: [],
      tours: [],
      stories: [],
      reviews: [],
      slides: [],
      posts: [],
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
