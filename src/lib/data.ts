import { type Tour, type Review } from "@/lib/types";

export const tours: Tour[] = [
  {
    id: "tour-1",
    name: "Mystical Mountain Escape",
    description: "Journey through serene mountain landscapes and ancient forests. A true escape to nature's tranquility.",
    price: 499,
    duration: "5 Days",
    imageId: "tour-mountain"
  },
  {
    id: "tour-2",
    name: "Coastal Wonders Expedition",
    description: "Explore dramatic coastlines, hidden beaches, and charming seaside villages. Perfect for ocean lovers.",
    price: 699,
    duration: "7 Days",
    imageId: "tour-coastal"
  },
  {
    id: "tour-3",
    name: "Vibrant City Lights",
    description: "Immerse yourself in the bustling energy of the city, from iconic landmarks to hidden local gems.",
    price: 350,
    duration: "3 Days",
    imageId: "tour-city"
  },
];

export const reviews: Review[] = [
  {
    id: "rev-1",
    name: "Alex Johnson",
    country: "USA",
    language: "en",
    rating: 5,
    message: "The Mountain Escape was absolutely breathtaking! Every detail was perfectly organized. The views were surreal and our guide was fantastic. Highly recommend!",
    tourId: "tour-1",
    tourName: "Mystical Mountain Escape",
    status: "approved",
    createdAt: new Date("2023-10-20"),
  },
  {
    id: "rev-2",
    name: "Maria Garcia",
    country: "Spain",
    language: "es",
    message: "Una experiencia inolvidable en la costa. Los paisajes son de ensueño y la comida local deliciosa. El hotel podría haber sido un poco mejor, pero en general, ¡excelente!",
    rating: 4,
    tourId: "tour-2",
    tourName: "Coastal Wonders Expedition",
    status: "approved",
    createdAt: new Date("2023-11-05"),
  },
  {
    id: "rev-3",
    name: "Kenji Tanaka",
    country: "Japan",
    language: "ja",
    rating: 5,
    message: "City Lights tour was a fantastic way to see the city. Our guide showed us so many places we would have never found on our own. It was fast-paced but so much fun.",
    tourId: "tour-3",
    tourName: "Vibrant City Lights",
    status: "approved",
    createdAt: new Date("2023-11-15"),
  },
   {
    id: "rev-4",
    name: "Chloe Dubois",
    country: "France",
    language: "fr",
    rating: 3,
    message: "Le tour des montagnes était bien, mais il a plu presque tous les jours, ce qui a un peu gâché l'expérience. L'organisation était bonne cependant.",
    tourId: "tour-1",
    tourName: "Mystical Mountain Escape",
    status: "pending",
    createdAt: new Date("2023-12-01"),
    photoUrl: "https://picsum.photos/seed/101/400/300"
  },
   {
    id: "rev-5",
    name: "Ben Carter",
    country: "Australia",
    language: "en",
    rating: 5,
    message: "Did the coastal tour and it was epic! The views were insane and our group was a lot of fun. The accommodation was top-notch too. 10/10 would do it again.",
    tourId: "tour-2",
    tourName: "Coastal Wonders Expedition",
    status: "pending",
    createdAt: new Date("2023-12-02"),
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
