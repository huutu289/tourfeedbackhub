import { type Tour, type Review, type SiteSettings, type TourType, type Story } from "@/lib/types";

export const siteSettings: SiteSettings = {
  heroTitle: "Share Your Journey, Shape Ours",
  heroSubtitle:
    "Your honest reflections help us refine every itinerary and craft unforgettable moments for future travellers.",
  heroCtaLabel: "Leave a Review",
  heroMediaUrl: "https://picsum.photos/seed/1/1600/900",
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
    code: "FT-2024-01",
    name: "Mist & Lanterns: Central Highlands Retreat",
    summary:
      "Five unforgettable days across Da Lat and Bao Loc with artisan workshops, hidden tea houses, and twilight forest walks.",
    startDate: new Date("2024-03-02"),
    endDate: new Date("2024-03-06"),
    clientCount: 4,
    clientNationalities: ["Australia", "Vietnam"],
    clientCountry: "Australia",
    clientCity: "Melbourne",
    provinces: ["Lam Dong"],
    itinerary:
      "Day 1: Arrival and sunset rooftop tea.\nDay 2: Pine forest hike and private coffee cupping.\nDay 3: Silk weaving villages and lantern workshop.\nDay 4: Bao Loc waterfall picnic and spa.\nDay 5: Farewell brunch in Da Lat old town.",
    photoUrls: ["https://picsum.photos/seed/2/1600/900", "https://picsum.photos/seed/22/1200/800"],
    videoUrls: ["https://samplelib.com/lib/preview/mp4/sample-5s.mp4"],
    tourTypeIds: ["boutique", "heritage"],
    guideName: "Trang Nguyen",
    guideLanguages: ["English"],
    status: "finished",
  },
  {
    id: "tour-2",
    code: "FT-2024-07",
    name: "Coastal Reverie: Hoi An & The Cham Islands",
    summary:
      "An oceanfront diary of seafood feasts, sunrise snorkelling, and twilight lantern releases along Hoi An's Ancient Town.",
    startDate: new Date("2024-05-14"),
    endDate: new Date("2024-05-18"),
    clientCount: 6,
    clientNationalities: ["Spain", "France"],
    clientCountry: "Spain",
    clientCity: "Barcelona",
    provinces: ["Quang Nam"],
    itinerary:
      "Day 1: Hoi An street food warm-up.\nDay 2: Cham Islands snorkelling and private beach picnic.\nDay 3: Lantern making with artisans.\nDay 4: Basket boat ride and fisherman supper.\nDay 5: Sunrise photography walk and farewell brunch.",
    photoUrls: ["https://picsum.photos/seed/3/1600/900", "https://picsum.photos/seed/33/1200/800"],
    videoUrls: [],
    tourTypeIds: ["culinary", "boutique"],
    guideName: "Minh Tran",
    guideLanguages: ["Spanish", "English"],
    status: "finished",
  },
  {
    id: "tour-3",
    code: "FT-2024-12",
    name: "Heritage Symphony: Hue to Hanoi",
    summary:
      "A northbound chronicle weaving royal cuisine, imperial music, and limestone bays into seven reflections on heritage.",
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-07"),
    clientCount: 5,
    clientNationalities: ["Japan"],
    clientCountry: "Japan",
    clientCity: "Tokyo",
    provinces: ["Thua Thien Hue", "Ha Noi", "Quang Ninh"],
    itinerary:
      "Day 1: Hue royal welcome dinner.\nDay 2: Imperial citadel and garden houses.\nDay 3: DMZ storytelling and overnight train north.\nDay 4: Hanoi coffee crawl and old quarter walk.\nDay 5: Ha Long Bay private cruise.\nDay 6: Village cooking and water puppets.\nDay 7: Reflection brunch and departures.",
    photoUrls: ["https://picsum.photos/seed/4/1600/900"],
    videoUrls: ["https://samplelib.com/lib/preview/mp4/sample-10s.mp4"],
    tourTypeIds: ["heritage"],
    guideName: "Lan Pham",
    guideLanguages: ["Japanese", "English"],
    status: "finished",
  },
];

export const stories: Story[] = [
  {
    id: "story-1",
    title: "How We Curate Bespoke Wellness Retreats",
    excerpt:
      "Behind every misty sunrise session is a network of wellness experts, naturalists, and boutique hosts working in harmony.",
    coverImageUrl: "https://picsum.photos/seed/5/1200/800",
    publishedAt: new Date("2024-07-12"),
    readTimeMinutes: 4,
  },
  {
    id: "story-2",
    title: "Five Dishes You Can Only Taste with Our Hosts",
    excerpt:
      "From royal banquets to fishermen's dawn harvests, explore the flavours travellers rave about after every trip.",
    coverImageUrl: "https://picsum.photos/seed/6/1200/800",
    publishedAt: new Date("2024-06-01"),
    readTimeMinutes: 5,
  },
  {
    id: "story-3",
    title: "Sustainable Partnerships Along The Coast",
    excerpt:
      "We team up with local communities to ensure each experience directly supports preservation and livelihoods.",
    coverImageUrl: "https://picsum.photos/seed/7/1200/800",
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
    photoUrls: ["https://picsum.photos/seed/8/600/800"],
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
    photoUrls: ["https://picsum.photos/seed/9/600/800"],
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
  { name: "Vietnam", code: "VN" },
  { name: "Italy", code: "IT" },
  { name: "China", code: "CN" },
  { name: "South Korea", code: "KR" },
  { name: "Singapore", code: "SG" },
  { name: "Thailand", code: "TH" },
  { name: "Malaysia", code: "MY" },
  { name: "India", code: "IN" },
  { name: "New Zealand", code: "NZ" },
  { name: "Netherlands", code: "NL" },
  { name: "Belgium", code: "BE" },
  { name: "Switzerland", code: "CH" },
  { name: "Austria", code: "AT" },
  { name: "Sweden", code: "SE" },
  { name: "Norway", code: "NO" },
  { name: "Denmark", code: "DK" },
];

export const citiesByCountry: Record<string, string[]> = {
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington", "Boston", "Nashville", "Detroit", "Portland", "Las Vegas", "Miami"],
  "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor"],
  "United Kingdom": ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Edinburgh", "Leeds", "Bristol", "Sheffield", "Newcastle", "Belfast", "Cardiff", "Nottingham", "Southampton", "Leicester"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Logan City", "Geelong", "Hobart", "Townsville", "Cairns", "Darwin"],
  "Germany": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden", "Hanover", "Nuremberg", "Duisburg"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón"],
  "Japan": ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama", "Hiroshima", "Sendai", "Chiba", "Kitakyushu", "Sakai"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre", "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís"],
  "Vietnam": ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hai Phong", "Can Tho", "Bien Hoa", "Hue", "Nha Trang", "Buon Ma Thuot", "Qui Nhon", "Vung Tau", "Da Lat", "Vinh", "Thai Nguyen", "Ha Long"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania", "Venice", "Verona", "Messina", "Padua", "Trieste"],
  "China": ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Chongqing", "Tianjin", "Wuhan", "Hangzhou", "Xi'an", "Nanjing", "Suzhou", "Harbin", "Qingdao", "Dalian"],
  "South Korea": ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan", "Changwon", "Goyang", "Yongin", "Seongnam", "Cheongju", "Bucheon", "Ansan"],
  "Singapore": ["Singapore"],
  "Thailand": ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Nakhon Ratchasima", "Hat Yai", "Udon Thani", "Surat Thani", "Khon Kaen", "Nakhon Si Thammarat", "Chiang Rai", "Rayong", "Krabi", "Hua Hin", "Ayutthaya"],
  "Malaysia": ["Kuala Lumpur", "George Town", "Ipoh", "Shah Alam", "Petaling Jaya", "Johor Bahru", "Malacca City", "Kota Kinabalu", "Kuching", "Alor Setar", "Seremban", "Kuantan", "Kota Bharu", "Miri", "Sandakan"],
  "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane"],
  "New Zealand": ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Napier", "Dunedin", "Palmerston North", "Nelson", "Rotorua", "New Plymouth", "Whangarei", "Invercargill", "Queenstown", "Gisborne"],
  "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Enschede", "Apeldoorn", "Haarlem", "Arnhem", "Zaanstad"],
  "Belgium": ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur", "Leuven", "Mons", "Aalst", "Mechelen", "La Louvière", "Kortrijk", "Hasselt", "Ostend"],
  "Switzerland": ["Zürich", "Geneva", "Basel", "Lausanne", "Bern", "Winterthur", "Lucerne", "St. Gallen", "Lugano", "Biel/Bienne", "Thun", "Köniz", "La Chaux-de-Fonds", "Schaffhausen", "Fribourg"],
  "Austria": ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Wels", "Sankt Pölten", "Dornbirn", "Steyr", "Wiener Neustadt", "Feldkirch", "Bregenz", "Leonding"],
  "Sweden": ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg", "Jönköping", "Norrköping", "Lund", "Umeå", "Gävle", "Borås", "Eskilstuna"],
  "Norway": ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Sandnes", "Tromsø", "Sarpsborg", "Skien", "Ålesund", "Sandefjord", "Haugesund", "Tønsberg"],
  "Denmark": ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle", "Roskilde", "Herning", "Silkeborg", "Næstved", "Fredericia", "Viborg"],
};

export const languages = [
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "French", code: "fr" },
  { name: "German", code: "de" },
  { name: "Japanese", code: "ja" },
];
