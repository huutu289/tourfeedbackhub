import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { revalidatePath } from 'next/cache';

const commentSchema = z.object({
  authorName: z.string().min(1, 'Name is required'),
  rating: z.number().min(1).max(5),
  message: z.string().min(1, 'Message is required'),
});

export async function POST(request: Request, { params }: { params: { tourId: string } }) {
  const tourId = params.tourId;

  if (!tourId) {
    return NextResponse.json({ error: 'Missing tour id' }, { status: 400 });
  }

  const admin = initializeFirebaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 500 });
  }

  const { firestore } = admin;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
  }

  const { authorName, rating, message } = parsed.data;

  try {
    const tourSnapshot = await firestore.collection('tours').doc(tourId).get();
    if (!tourSnapshot.exists) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    const tourData = tourSnapshot.data() ?? {};
    const tourName = typeof tourData.name === 'string' ? tourData.name : tourData.title ?? '';

    await firestore.collection('reviews').add({
      authorDisplay: authorName,
      country: '',
      language: 'en',
      rating,
      message,
      tourId,
      tourName,
      status: 'pending',
      reviewType: 'finishedTour',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, requiresApproval: true });
  } catch (error) {
    console.error('Failed to submit finished tour comment', error);
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 });
  }
}
