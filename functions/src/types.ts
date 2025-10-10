/**
 * @file Type definitions for Cloud Functions
 */

export interface FeedbackSubmitPayload {
  name: string;
  country: string;
  language: string;
  rating: number;
  message: string;
  tourId?: string;
  recaptchaToken: string;
  hasAttachment: boolean;
  attachmentMetadata?: {
    fileName: string;
    contentType: string;
    size: number;
  } | null;
}

export interface FeedbackDocument {
  name: string;
  country: string;
  language: string;
  rating: number;
  message: string;
  tourId?: string;
  photoUrl?: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: admin.firestore.Timestamp;
  feedbackSummary?: string | null;
  detectedLanguage?: string | null;
  uploadId?: string | null;
}

export interface ReviewDocument {
  id: string;
  authorDisplay: string;
  country: string;
  language: string;
  rating: number;
  message: string;
  summary?: string | null;
  tourId?: string | null;
  tourName?: string | null;
  photoUrls: string[];
  createdAt: admin.firestore.Timestamp;
  approvedAt: admin.firestore.Timestamp;
  feedbackId: string;
}

export interface UploadDetails {
  uploadUrl: string;
  method?: string;
  headers?: Record<string, string>;
  uploadId: string;
}

export interface FeedbackSubmitResponse {
  success: boolean;
  feedbackId?: string;
  uploadDetails?: UploadDetails;
  error?: {
    code?: string;
    message: string;
  };
}

import * as admin from "firebase-admin";
