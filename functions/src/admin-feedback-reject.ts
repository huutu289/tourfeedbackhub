/**
 * @file Admin Feedback Reject Cloud Function
 *
 * Handles rejection of pending feedback:
 * - Verifies admin authentication
 * - Deletes any temporary uploaded photos
 * - Updates feedback status to rejected
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import type { FeedbackDocument } from "./types";

interface RejectPayload {
  feedbackId: string;
  reason?: string;
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

export const adminFeedbackReject = onRequest(
  {
    region: "us-central1",
    cors: true, // Use built-in CORS handling
    maxInstances: 10,
    memory: "256MiB",
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
        console.warn(`Non-admin user attempted to reject feedback: ${decodedToken.uid}`);
        response.status(403).json({
          success: false,
          error: { code: "forbidden", message: "Admin access required" },
        });
        return;
      }

      // 2. Parse payload
      const payload = request.body as RejectPayload;

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

      // 4. Delete temporary uploaded photo if exists
      if (feedbackData.photoUrl) {
        try {
          const bucket = admin.storage().bucket();

          // Delete all files in the tmp folder for this feedback
          const tmpPrefix = `uploads/tmp/${payload.feedbackId}/`;
          const [files] = await bucket.getFiles({ prefix: tmpPrefix });

          for (const file of files) {
            await file.delete();
            console.log(`Deleted tmp file: ${file.name}`);
          }
        } catch (error) {
          console.error("Error deleting tmp photos:", error);
          // Continue anyway - don't fail rejection due to photo deletion issues
        }
      }

      // 5. Update feedback status to rejected
      await feedbackRef.update({
        status: "rejected",
        rejectedAt: admin.firestore.Timestamp.now(),
        rejectedBy: decodedToken.uid,
        rejectionReason: payload.reason || null,
      });

      console.log(`Feedback ${payload.feedbackId} rejected by admin ${decodedToken.uid}`);

      // 6. Return success
      response.status(200).json({
        success: true,
      });
    } catch (error) {
      console.error("Error in adminFeedbackReject:", error);
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
