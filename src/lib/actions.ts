"use server";

import { z } from "zod";
import { summarizeFeedback } from "@/ai/flows/summarize-feedback";

const feedbackSchema = z.object({
  name: z.string(),
  country: z.string(),
  language: z.string(),
  rating: z.coerce.number(),
  message: z.string(),
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

    // Here you would save to Firestore with 'pending' status
    console.log("Submitting feedback:", parsedData);
    await delay(1000);
    
    // Here you would also integrate App Check / reCAPTCHA verification
    
    return { success: true };
  } catch (error) {
    console.error("Feedback submission error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid form data." };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function approveReview(reviewId: string) {
    try {
        // Simulate updating review status in Firestore
        console.log(`Approving review ${reviewId}`);
        await delay(500);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to approve review." };
    }
}

export async function rejectReview(reviewId: string) {
    try {
        // Simulate deleting/updating review in Firestore
        console.log(`Rejecting review ${reviewId}`);
        await delay(500);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to reject review." };
    }
}

export async function summarizeReview(feedbackMessage: string) {
    try {
        const result = await summarizeFeedback({ feedbackMessage });
        return { summary: result.summary, language: result.language };
    } catch (error) {
        console.error("AI Summarization error:", error);
        throw new Error("Failed to summarize feedback.");
    }
}
