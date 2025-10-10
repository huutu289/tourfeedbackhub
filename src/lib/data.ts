import { type Tour, type Review, type SiteSettings, type TourType, type Story } from "@/lib/types";

export const siteSettings: SiteSettings = {
  heroTitle: "Share Your Journey, Shape Ours",
  heroSubtitle:
    "Your honest reflections help us refine every itinerary and craft unforgettable moments for future travellers.",
  heroCtaLabel: "Leave a Review",
  heroMediaUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  aboutTitle: "Guiding Boutique Adventures Across Vietnam",
  aboutDescription:
    "I am Trang, your private tour designer. From hidden mountain retreats to coastal culinary escapes, I curate bespoke experiences grounded in local expertise and heartfelt hospitality.",
  missionStatement:
    "Deliver deeply personal journeys that celebrate culture, comfort, and connection.",
  values: [
    "Authentic local partnerships",
    "Sustainable travel choices",
    "Tailored, small-group attention",
  ],
  contact: {
    email: "hello@tourfeedbackhub.com",
    phone: "+84 912 345 678",
    whatsapp: "https://wa.me/84912345678",
    facebook: "https://facebook.com/tourfeedbackhub",
    instagram: "https://instagram.com/tourfeedbackhub",
    zalo: "https://zalo.me/0912345678",
    location: "Da Nang, Vietnam",
  },
  languages: ["en", "it"],
  defaultLanguage: "en",
  primaryColor: "#77B5FE",
  accentColor: "#4682B4",
};

export const tourTypes: TourType[] = [
  {
    id: "boutique",
    title: "Boutique Experiences",
    description: "Handpicked accommodations and intimate itineraries with refined touches throughout.",
    icon: "hotel",
    order: 1,
  },
  {
    id: "culinary",
    title: "Culinary Journeys",
    description: "Explore vibrant markets, master local dishes, and dine with trusted hosts.",
    icon: "utensils",
    order: 2,
  },
  {
    id: "heritage",
    title: "Heritage Trails",
    description: "Walk through UNESCO sites and untold stories guided by local historians.",
    icon: "landmark",
    order: 3,
  },
];

export const tours: Tour[] = [
  {
    id: "tour-1",
    name: "Mist & Lanterns: Central Highlands Retreat",
    summary:
      "A five-day escape through Da Lat's pine forests and cozy tea houses, blending wellness, coffee culture, and artisan workshops.",
    durationLabel: "5 days",
    priceFrom: 890,
    coverImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    tourTypeIds: ["boutique", "heritage"],
    highlights: ["Private hydrotherapy session", "Sunrise forest hike", "Chef-led farm-to-table dinner"],
  },
  {
    id: "tour-2",
    name: "Coastal Reverie: Hoi An & The Cham Islands",
    summary:
      "Sail translucent waters, savour coastal cuisine, and reconnect with artisans preserving ancient lantern craft.",
    durationLabel: "4 days",
    priceFrom: 760,
    coverImageUrl: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80",
    tourTypeIds: ["culinary", "boutique"],
    highlights: ["Lantern making workshop", "Cham Islands snorkelling", "Private moonlit dinner"],
  },
  {
    id: "tour-3",
    name: "Heritage Symphony: Hue to Hanoi",
    summary:
      "Trace Vietnam's imperial legacy with curated access to royal cuisine, court music, and riverside villas.",
    durationLabel: "7 days",
    priceFrom: 1240,
    coverImageUrl: "https://images.unsplash.com/photo-1527258127-87e06c1f465e?auto=format&fit=crop&w=1600&q=80",
    tourTypeIds: ["heritage"],
    highlights: ["Cyclo evening food crawl", "Private Hue garden house lunch", "Overnight Ha Long Bay cruise"],
  },
];

export const stories: Story[] = [
  {
    id: "story-1",
    title: "How We Curate Bespoke Wellness Retreats",
    excerpt:
      "Behind every misty sunrise session is a network of wellness experts, naturalists, and boutique hosts working in harmony.",
    coverImageUrl: "https://images.unsplash.com/photo-1499696010181-8d8fdc76d1a5?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date("2024-07-12"),
    readTimeMinutes: 4,
  },
  {
    id: "story-2",
    title: "Five Dishes You Can Only Taste with Our Hosts",
    excerpt:
      "From royal banquets to fishermen's dawn harvests, explore the flavours travellers rave about after every trip.",
    coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date("2024-06-01"),
    readTimeMinutes: 5,
  },
  {
    id: "story-3",
    title: "Sustainable Partnerships Along The Coast",
    excerpt:
      "We team up with local communities to ensure each experience directly supports preservation and livelihoods.",
    coverImageUrl: "https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date("2024-05-10"),
    readTimeMinutes: 3,
  },
];

export const reviews: Review[] = [
  {
    id: "rev-1",
    authorDisplay: "Alex Johnson",
    country: "USA",
    language: "en",
    rating: 5,
    message:
      "The Mist & Lanterns retreat exceeded every expectation. Trang curated moments I didn't know I needed—especially the silent tea ceremony at dawn.",
    tourId: "tour-1",
    tourName: "Mist & Lanterns: Central Highlands Retreat",
    status: "approved",
    createdAt: new Date("2024-02-20"),
    photoUrls: ["https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=600&q=80"],
    summary: "A flawless, restorative mountain escape highlighted by thoughtful wellness touches.",
  },
  {
    id: "rev-2",
    authorDisplay: "Maria Garcia",
    country: "Spain",
    language: "es",
    rating: 4,
    message:
      "El viaje a las islas Cham fue mágico. Solo recomendaría un día extra para explorar más la gastronomía local. ¡La cena privada fue inolvidable!",
    tourId: "tour-2",
    tourName: "Coastal Reverie: Hoi An & The Cham Islands",
    status: "approved",
    createdAt: new Date("2024-03-15"),
  },
  {
    id: "rev-3",
    authorDisplay: "Kenji Tanaka",
    country: "Japan",
    language: "ja",
    rating: 5,
    message:
      "Hue からハノイまでの旅は、歴史が生きているような感覚でした。伝統音楽のプライベート公演は一生忘れません。",
    tourId: "tour-3",
    tourName: "Heritage Symphony: Hue to Hanoi",
    status: "approved",
    createdAt: new Date("2024-04-02"),
  },
  {
    id: "rev-4",
    authorDisplay: "Chloe Dubois",
    country: "France",
    language: "fr",
    rating: 3,
    message:
      "Les paysages étaient magnifiques mais la météo capricieuse. Trang a tout de même trouvé des alternatives très appréciées.",
    tourId: "tour-1",
    tourName: "Mist & Lanterns: Central Highlands Retreat",
    status: "pending",
    createdAt: new Date("2024-04-21"),
    photoUrls: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80"],
  },
  {
    id: "rev-5",
    authorDisplay: "Ben Carter",
    country: "Australia",
    language: "en",
    rating: 5,
    message:
      "From snorkelling with our private marine guide to the lantern release, every detail felt curated with intention.",
    tourId: "tour-2",
    tourName: "Coastal Reverie: Hoi An & The Cham Islands",
    status: "pending",
    createdAt: new Date("2024-04-24"),
  },
];

export const countries = [
  { name: "United States", code: "US" },
  { name: "Canada", code: "CA" },
  { name: "United Kingdom", code: "GB" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Spain", code: "ES" },
  { name: "Japan", code: "JP" },
  { name: "Brazil", code: "BR" },
];

export const languages = [
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "French", code: "fr" },
  { name: "German", code: "de" },
  { name: "Japanese", code: "ja" },
];
