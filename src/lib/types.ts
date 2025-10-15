export interface TourType {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order?: number;
}

export interface Tour {
  id: string;
  code: string;
  name: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  clientCount: number;
  clientNationalities: string[];
  clientNationalityIds?: string[];
  clientCountry: string;
  clientCity: string;
  provinces?: string[];
  provinceIds?: string[];
  itinerary: string;
  photoUrls: string[];
  videoUrls: string[];
  tourTypeIds?: string[];
  guideId?: string;
  guideName: string;
  guideLanguages: string[];
  guideLanguageIds?: string[];
  status: 'finished' | 'for_sale';
}

export interface Story {
  id: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  publishedAt: Date;
  readTimeMinutes?: number;
}

export interface Review {
  id: string;
  authorDisplay: string;
  country: string;
  language: string;
  rating: number;
  message: string;
  tourId?: string;
  tourName?: string;
  photoUrls?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  summary?: string;
}

export interface Feedback extends Review {
  submittedAt: Date;
  attachments?: Array<{
    fileName: string;
    storagePath: string;
    downloadUrl?: string;
  }>;
}

export interface FinishedTourComment {
  id: string;
  tourId: string;
  authorName: string;
  rating: number;
  message: string;
  createdAt: Date;
}

export interface GuideLanguage {
  id: string;
  name: string;
  code?: string;
}

export interface Province {
  id: string;
  name: string;
  country?: string;
}

export interface Nationality {
  id: string;
  name: string;
  code?: string;
}

export interface Guide {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  languageIds?: string[];
  provinceIds?: string[];
  nationalityIds?: string[];
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  zalo?: string;
  facebook?: string;
  instagram?: string;
  location?: string;
}

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroMediaUrl?: string;
  aboutTitle: string;
  aboutDescription: string;
  missionStatement?: string;
  values?: string[];
  contact: ContactInfo;
  languages: string[];
  defaultLanguage: string;
  primaryColor?: string;
  accentColor?: string;
}

export interface PublicContent {
  siteSettings: SiteSettings;
  tourTypes: TourType[];
  tours: Tour[];
  stories: Story[];
  reviews: Review[];
}
