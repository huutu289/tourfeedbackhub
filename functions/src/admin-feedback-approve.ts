/**
 * @file Admin Feedback Approve Cloud Function
 *
 * Handles approval of pending feedback:
 * - Verifies admin authentication
 * - Sanitizes content and removes PII
 * - Creates public review document
 * - Moves uploaded photos from tmp to public storage
 * - Optionally calls Genkit AI for summarization
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { removePII, generateDisplayName } from "./utils";
import type { FeedbackDocument, ReviewDocument } from "./types";

interface ApprovePayload {
  feedbackId: string;
}

/**
 * Verify that the user is an admin
 */
async function verifyAdmin(request: admin.auth.DecodedIdToken | null): Promise<boolean> {
  if (!request) {
    return false;
  }

  // Check custom claims for admin role
  return request.admin === true;
}

/**
 * Get ID token from Authorization header
 */
async function getAuthToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.substring(7);

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export const adminFeedbackApprove = onRequest(
  {
    region: "us-central1",
    cors: true, // Use built-in CORS handling
    maxInstances: 10,
    memory: "512MiB",
  },
  async (request, response) => {
    // Only accept POST
    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        error: { code: "method_not_allowed", message: "Only POST requests are allowed" },
      });
      return;
    }

    try {
      // 1. Verify admin authentication
      const authHeader = request.headers.authorization as string | undefined;
      const decodedToken = await getAuthToken(authHeader);

      if (!decodedToken) {
        response.status(401).json({
          success: false,
          error: { code: "unauthorized", message: "Authentication required" },
        });
        return;
      }

      const isAdmin = await verifyAdmin(decodedToken);
      if (!isAdmin) {
        console.warn(`Non-admin user attempted to approve feedback: ${decodedToken.uid}`);
        response.status(403).json({
          success: false,
          error: { code: "forbidden", message: "Admin access required" },
        });
        return;
      }

      // 2. Parse payload
      const payload = request.body as ApprovePayload;

      if (!payload.feedbackId) {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "Missing feedbackId" },
        });
        return;
      }

      // 3. Get feedback document
      const db = admin.firestore();
      const feedbackRef = db.collection("feedback").doc(payload.feedbackId);
      const feedbackSnap = await feedbackRef.get();

      if (!feedbackSnap.exists) {
        response.status(404).json({
          success: false,
          error: { code: "feedback_not_found", message: "Feedback not found" },
        });
        return;
      }

      const feedbackData = feedbackSnap.data() as FeedbackDocument;

      if (feedbackData.status !== "pending") {
        response.status(400).json({
          success: false,
          error: { code: "invalid_status", message: `Feedback is already ${feedbackData.status}` },
        });
        return;
      }

      // 4. Sanitize content and remove PII
      const sanitizedMessage = removePII(feedbackData.message);
      const authorDisplay = generateDisplayName(feedbackData.name, feedbackData.country);

      // 5. Get tour name if tourId is provided
      let tourName: string | null = null;
      if (feedbackData.tourId) {
        const tourSnap = await db.collection("tours").doc(feedbackData.tourId).get();
        if (tourSnap.exists) {
          tourName = tourSnap.data()?.name || null;
        }
      }

      // 6. Move photo from tmp to public if exists
      let publicPhotoUrls: string[] = [];

      if (feedbackData.photoUrl) {
        try {
          const bucket = admin.storage().bucket();
          const tmpPath = feedbackData.photoUrl.replace(`gs://${bucket.name}/`, "");
          const tmpFile = bucket.file(tmpPath);

          const [exists] = await tmpFile.exists();
          if (exists) {
            // Extract file extension
            const fileExt = tmpPath.split(".").pop() || "jpg";
            const publicPath = `public/reviews/${payload.feedbackId}/photo.${fileExt}`;
            const publicFile = bucket.file(publicPath);

            // Copy file to public location
            await tmpFile.copy(publicFile);

            // Make file publicly accessible
            await publicFile.makePublic();

            // Delete tmp file
            await tmpFile.delete();

            // Get public URL
            publicPhotoUrls = [`https://storage.googleapis.com/${bucket.name}/${publicPath}`];

            console.log(`Moved photo from ${tmpPath} to ${publicPath}`);
          }
        } catch (error) {
          console.error("Error moving photo:", error);
          // Continue anyway - don't fail approval due to photo issues
        }
      }

      // 7. Optional: Call Genkit AI for summarization (if available)
      // This would integrate with your Genkit flows
      // For now, we'll skip AI summarization and implement it later if needed
      let summary: string | null = null;

      // 8. Create public review document
      const reviewRef = db.collection("reviews").doc();

      const reviewData: ReviewDocument = {
        id: reviewRef.id,
        authorDisplay,
        country: feedbackData.country,
        language: feedbackData.language,
        rating: feedbackData.rating,
        message: sanitizedMessage,
        summary,
        tourId: feedbackData.tourId || null,
        tourName,
        photoUrls: publicPhotoUrls,
        createdAt: feedbackData.submittedAt,
        approvedAt: admin.firestore.Timestamp.now(),
        feedbackId: payload.feedbackId,
      };

      await reviewRef.set(reviewData);

      // 9. Update feedback status
      await feedbackRef.update({
        status: "approved",
        approvedAt: admin.firestore.Timestamp.now(),
        reviewId: reviewRef.id,
      });

      console.log(`Feedback ${payload.feedbackId} approved by admin ${decodedToken.uid}, review created: ${reviewRef.id}`);

      // 10. Return success
      response.status(200).json({
        success: true,
        reviewId: reviewRef.id,
      });
    } catch (error) {
      console.error("Error in adminFeedbackApprove:", error);
      response.status(500).json({
        success: false,
        error: {
          code: "internal_error",
          message: "An internal error occurred. Please try again later.",
        },
      });
    }
  }
);
