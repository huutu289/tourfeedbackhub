/**
 * @file Feedback Upload Complete Cloud Function
 *
 * Called after client successfully uploads photo to signed URL
 * Updates the feedback document with the photo URL
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { verifyAppCheck } from "./utils";

interface UploadCompletePayload {
  feedbackId: string;
  uploadId: string;
}

export const feedbackUploadComplete = onRequest(
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
      // 1. Verify App Check
      const appCheckValid = await verifyAppCheck(request);
      if (!appCheckValid) {
        response.status(403).json({
          success: false,
          error: { code: "app_check_failed", message: "App Check verification failed" },
        });
        return;
      }

      // 2. Parse payload
      const payload = request.body as UploadCompletePayload;

      if (!payload.feedbackId || !payload.uploadId) {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "Missing feedbackId or uploadId" },
        });
        return;
      }

      // 3. Verify feedback exists and uploadId matches
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

      const feedbackData = feedbackSnap.data();
      if (feedbackData?.uploadId !== payload.uploadId) {
        console.warn(`Upload ID mismatch for feedback ${payload.feedbackId}`);
        response.status(403).json({
          success: false,
          error: { code: "upload_id_mismatch", message: "Invalid upload ID" },
        });
        return;
      }

      // 4. Find the uploaded file in Storage
      const bucket = admin.storage().bucket();
      const tmpPrefix = `uploads/tmp/${payload.feedbackId}/${payload.uploadId}_`;

      const [files] = await bucket.getFiles({ prefix: tmpPrefix });

      if (files.length === 0) {
        console.warn(`No file found for feedback ${payload.feedbackId} with uploadId ${payload.uploadId}`);
        response.status(404).json({
          success: false,
          error: { code: "file_not_found", message: "Uploaded file not found" },
        });
        return;
      }

      // Get the first (and should be only) file
      const uploadedFile = files[0];
      const publicUrl = `gs://${bucket.name}/${uploadedFile.name}`;

      // 5. Update feedback document with photo URL
      await feedbackRef.update({
        photoUrl: publicUrl,
        uploadId: admin.firestore.FieldValue.delete(), // Remove uploadId after successful upload
      });

      console.log(`Upload completed for feedback ${payload.feedbackId}: ${publicUrl}`);

      // 6. Return success
      response.status(200).json({
        success: true,
        photoUrl: publicUrl,
      });
    } catch (error) {
      console.error("Error in feedbackUploadComplete:", error);
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
