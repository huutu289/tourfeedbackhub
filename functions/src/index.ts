/**
 * @file Cloud Functions entry point for TourFeedbackHub
 *
 * This file exports all HTTP Cloud Functions (v2) for handling:
 * - Anonymous feedback submission with App Check + reCAPTCHA
 * - Photo upload workflow with signed URLs
 * - Admin moderation (approve/reject)
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { feedbackSubmit } from "./feedback-submit";
export { feedbackUploadComplete } from "./feedback-upload-complete";
export { adminFeedbackApprove } from "./admin-feedback-approve";
export { adminFeedbackReject } from "./admin-feedback-reject";
export { adminGenerateUploadUrl } from "./admin-generate-upload-url";
