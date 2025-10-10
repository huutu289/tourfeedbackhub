"use client";

import { getAppCheckToken } from "@/firebase/app-check";
import type { Review } from "@/lib/types";

type CloudFunctionError = {
  code?: string;
  message: string;
};

type FeedbackSubmitPayload = {
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
};

interface UploadDetails {
  uploadUrl: string;
  method?: string;
  headers?: Record<string, string>;
  uploadId: string;
}

interface FeedbackSubmitResponse {
  success: boolean;
  feedbackId?: string;
  uploadDetails?: UploadDetails;
  error?: CloudFunctionError;
}

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

function getFunctionsBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/$/, "");
}

async function withAppCheckHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
  const appCheckToken = await getAppCheckToken();
  if (!appCheckToken) {
    return headers;
  }
  return {
    ...headers,
    "X-Firebase-AppCheck": appCheckToken,
  };
}

async function callFunction(path: string, body: unknown, additionalHeaders: HeadersInit = {}) {
  const baseUrl = getFunctionsBaseUrl();
  const headersWithAppCheck = await withAppCheckHeaders({ ...DEFAULT_HEADERS, ...additionalHeaders });

  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: headersWithAppCheck,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Cloud Function ${path} returned ${response.status}`);
  }

  return response.json();
}

async function uploadAttachment(upload: UploadDetails, file: File) {
  const method = upload.method ?? "PUT";
  const headers = new Headers(upload.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type);
  }

  const uploadResponse = await fetch(upload.uploadUrl, {
    method,
    headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(errorText || "Failed to upload attachment");
  }
}

export async function submitFeedbackToCloudFunctions(payload: FeedbackSubmitPayload, photo?: File | null) {
  const response = (await callFunction("feedback-submit", payload, {
    "X-Recaptcha-Token": payload.recaptchaToken,
  })) as FeedbackSubmitResponse;

  if (!response.success || !response.feedbackId) {
    const message = response.error?.message ?? "Failed to submit feedback";
    throw new Error(message);
  }

  if (photo && response.uploadDetails) {
    await uploadAttachment(response.uploadDetails, photo);
    await callFunction("feedback-upload-complete", {
      feedbackId: response.feedbackId,
      uploadId: response.uploadDetails.uploadId,
    });
  }

  return response;
}

export async function approveFeedback(feedbackId: string) {
  await callFunction("admin-feedback-approve", { feedbackId });
}

export async function rejectFeedback(feedbackId: string) {
  await callFunction("admin-feedback-reject", { feedbackId });
}

export type ClientReview = Pick<Review, "id" | "authorDisplay" | "country" | "language" | "rating" | "message" | "tourId" | "tourName" | "photoUrls" | "createdAt" | "summary">;
