/**
 * @file Feedback Submit Cloud Function
 *
 * Handles anonymous feedback submission with:
 * - App Check verification
 * - reCAPTCHA Enterprise validation
 * - Rate limiting
 * - Input sanitization
 * - Optional photo upload via signed URL
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { verifyAppCheck, verifyRecaptcha, checkRateLimit, sanitizeInput, validateFileMetadata } from "./utils";
import type { FeedbackSubmitPayload, FeedbackDocument, FeedbackSubmitResponse, UploadDetails } from "./types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // In production, restrict to your domain
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Firebase-AppCheck, X-Recaptcha-Token",
};

export const feedbackSubmit = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 10,
    memory: "256MiB",
  },
  async (request, response) => {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      response.set(CORS_HEADERS);
      response.status(204).send("");
      return;
    }

    response.set(CORS_HEADERS);

    // Only accept POST
    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        error: { code: "method_not_allowed", message: "Only POST requests are allowed" },
      });
      return;
    }

    try {
      // 1. Rate limiting
      const clientIp = request.headers["x-forwarded-for"]?.toString().split(",")[0] || request.ip || "unknown";
      const rateCheck = checkRateLimit(clientIp);

      if (!rateCheck.allowed) {
        console.warn(`Rate limit exceeded for IP: ${clientIp}`);
        response.status(429).json({
          success: false,
          error: { code: "rate_limit_exceeded", message: "Too many requests. Please try again later." },
        });
        return;
      }

      // 2. Verify App Check
      const appCheckValid = await verifyAppCheck(request);
      if (!appCheckValid) {
        console.warn(`App Check verification failed for IP: ${clientIp}`);
        response.status(403).json({
          success: false,
          error: { code: "app_check_failed", message: "App Check verification failed" },
        });
        return;
      }

      // 3. Parse and validate payload
      const payload = request.body as FeedbackSubmitPayload;

      if (!payload.name || !payload.country || !payload.language || !payload.message || !payload.rating) {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "Missing required fields" },
        });
        return;
      }

      // Validate rating
      if (payload.rating < 1 || payload.rating > 5) {
        response.status(400).json({
          success: false,
          error: { code: "invalid_rating", message: "Rating must be between 1 and 5" },
        });
        return;
      }

      // Validate message length
      if (payload.message.length < 10 || payload.message.length > 2000) {
        response.status(400).json({
          success: false,
          error: { code: "invalid_message_length", message: "Message must be between 10 and 2000 characters" },
        });
        return;
      }

      // 4. Verify reCAPTCHA
      const recaptchaToken = request.headers["x-recaptcha-token"]?.toString() || payload.recaptchaToken;
      if (!recaptchaToken) {
        response.status(400).json({
          success: false,
          error: { code: "missing_recaptcha", message: "reCAPTCHA token is required" },
        });
        return;
      }

      const recaptchaResult = await verifyRecaptcha(recaptchaToken, "submit_feedback", 0.7);
      if (!recaptchaResult.success) {
        console.warn(`reCAPTCHA verification failed: ${recaptchaResult.reason}, score: ${recaptchaResult.score}`);
        response.status(403).json({
          success: false,
          error: {
            code: "recaptcha_failed",
            message: "reCAPTCHA verification failed. Please try again.",
          },
        });
        return;
      }

      // 5. Sanitize inputs
      const sanitizedName = sanitizeInput(payload.name).substring(0, 100);
      const sanitizedCountry = sanitizeInput(payload.country).substring(0, 50);
      const sanitizedLanguage = sanitizeInput(payload.language).substring(0, 10);
      const sanitizedMessage = sanitizeInput(payload.message);

      // Check for spam keywords
      const spamKeywords = ["viagra", "cialis", "casino", "poker", "lottery", "cryptocurrency"];
      const lowerMessage = sanitizedMessage.toLowerCase();
      if (spamKeywords.some((keyword) => lowerMessage.includes(keyword))) {
        console.warn(`Spam detected in message from IP: ${clientIp}`);
        response.status(400).json({
          success: false,
          error: { code: "spam_detected", message: "Your message contains prohibited content" },
        });
        return;
      }

      // 6. Validate file metadata if attachment is provided
      let uploadDetails: UploadDetails | undefined;
      let uploadId: string | undefined;

      if (payload.hasAttachment && payload.attachmentMetadata) {
        const fileValidation = validateFileMetadata(payload.attachmentMetadata);
        if (!fileValidation.valid) {
          response.status(400).json({
            success: false,
            error: { code: "invalid_file", message: fileValidation.error || "Invalid file" },
          });
          return;
        }

        // Generate upload ID
        uploadId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      }

      // 7. Create feedback document in Firestore
      const db = admin.firestore();
      const feedbackRef = db.collection("feedback").doc();

      const feedbackData: FeedbackDocument = {
        name: sanitizedName,
        country: sanitizedCountry,
        language: sanitizedLanguage,
        rating: payload.rating,
        message: sanitizedMessage,
        tourId: payload.tourId || undefined,
        photoUrl: null,
        status: "pending",
        submittedAt: admin.firestore.Timestamp.now(),
        feedbackSummary: null,
        detectedLanguage: null,
        uploadId: uploadId || undefined,
      };

      await feedbackRef.set(feedbackData);

      console.log(`Feedback submitted: ${feedbackRef.id} from ${clientIp}`);

      // 8. Generate signed URL for photo upload if needed
      if (payload.hasAttachment && payload.attachmentMetadata && uploadId) {
        const bucket = admin.storage().bucket();
        const fileName = `uploads/tmp/${feedbackRef.id}/${uploadId}_${payload.attachmentMetadata.fileName}`;
        const file = bucket.file(fileName);

        const [signedUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType: payload.attachmentMetadata.contentType,
        });

        uploadDetails = {
          uploadUrl: signedUrl,
          method: "PUT",
          headers: {
            "Content-Type": payload.attachmentMetadata.contentType,
          },
          uploadId,
        };
      }

      // 9. Return success response
      const responseData: FeedbackSubmitResponse = {
        success: true,
        feedbackId: feedbackRef.id,
        uploadDetails,
      };

      response.status(200).json(responseData);
    } catch (error) {
      console.error("Error in feedbackSubmit:", error);
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
