export interface TourType {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order?: number;
}

export interface Tour {
  id: string;
  name: string;
  summary: string;
  durationLabel: string;
  priceFrom: number;
  coverImageUrl: string;
  tourTypeIds?: string[];
  languages?: string[];
  highlights?: string[];
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

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  zalo?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
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
