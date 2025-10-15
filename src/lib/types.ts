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
  address?: string;
  mapEmbedUrl?: string;
  location?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  zalo?: string;
}

export interface SiteSettings {
  siteName: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroMediaUrl?: string;
  aboutTitle: string;
  aboutDescription: string;
  missionStatement?: string;
  values?: string[];
  contact: ContactInfo;
  social: SocialLinks;
  copyright?: string;
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

export type NavigationMenuKey = 'header' | 'footer';

export type NavigationItemType = 'internal' | 'external' | 'hash';

export type NavigationAudience = 'guest' | 'user' | 'admin';

export interface NavigationBadge {
  text: string;
  color?: string;
}

export type NavigationArea = 'links' | 'legal' | 'social' | 'contact' | 'cta';

export interface NavigationMenuItem {
  id: string;
  label: string;
  href: string;
  type: NavigationItemType;
  order: number;
  parentId?: string | null;
  icon?: string;
  target?: '_self' | '_blank';
  visibleFor?: NavigationAudience[];
  badge?: NavigationBadge;
  area?: NavigationArea;
  group?: string;
  children?: NavigationMenuItem[];
}

export interface NavigationMenu {
  id: string;
  key: NavigationMenuKey;
  locale?: string | null;
  title?: string;
  published: boolean;
  updatedAt?: Date;
  items: NavigationMenuItem[];
  flatItems?: NavigationMenuItem[];
}
