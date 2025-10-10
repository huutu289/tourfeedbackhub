'use server';

import { z } from 'zod';
import { summarizeFeedback } from '@/ai/flows/summarize-feedback';
import { getSdks, initializeFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { serverTimestamp, collection } from 'firebase/firestore';

const feedbackSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  country: z.string().min(1, 'Please select your country.'),
  language: z.string().min(1, 'Please select your language.'),
  rating: z.coerce.number().min(1, 'Please provide a rating.').max(5),
  message: z.string().min(10, 'Message must be at least 10 characters.').max(1000, 'Message must be 1000 characters or less.'),
  tourId: z.string().optional(),
});

// Simulate a database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function submitFeedback(formData: FormData) {
  try {
    const data = Object.fromEntries(formData);
    const parsedData = feedbackSchema.parse(data);

    // Here you would handle file upload to Firebase Storage
    // const photo = formData.get('photo') as File | null;
    // if (photo) { ... upload logic ... }
    
    // Here you would also integrate App Check / reCAPTCHA verification

    const { firestore } = getSdks(initializeFirebase().firebaseApp);
    const feedbackCollection = collection(firestore, 'feedback');
    
    addDocumentNonBlocking(feedbackCollection, {
        ...parsedData,
        status: 'pending',
        submittedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Feedback submission error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid form data.' };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function approveReview(reviewId: string) {
  try {
    // Simulate updating review status in Firestore
    console.log(`Approving review ${reviewId}`);
    await delay(500);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to approve review.' };
  }
}

export async function rejectReview(reviewId: string) {
  try {
    // Simulate deleting/updating review in Firestore
    console.log(`Rejecting review ${reviewId}`);
    await delay(500);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to reject review.' };
  }
}

export async function summarizeReview(feedbackMessage: string) {
  try {
    const result = await summarizeFeedback({ feedbackMessage });
    return { summary: result.summary, language: result.language };
  } catch (error) {
    console.error('AI Summarization error:', error);
    throw new Error('Failed to summarize feedback.');
  }
}
