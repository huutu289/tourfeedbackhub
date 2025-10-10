export interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  imageId: string;
}

export interface Review {
  id: string;
  name: string;
  country: string;
  language: string;
  rating: number;
  message: string;
  tourId?: string;
  tourName: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}
