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

async function getIdToken(): Promise<string | null> {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (e) {
    return null;
  }
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
    let errMsg = `Cloud Function ${path} returned ${response.status}`;
    let errCode: string | undefined;
    try {
      const parsed = JSON.parse(text);
      errCode = parsed?.error?.code;
      errMsg = parsed?.error?.message || errMsg;
    } catch (_) {
      if (text) errMsg = text;
    }
    const err: any = new Error(errMsg);
    if (errCode) err.code = errCode;
    (err as any).status = response.status;
    (err as any).raw = text;
    throw err;
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
  const response = (await callFunction("feedbackSubmit", payload, {
    "X-Recaptcha-Token": payload.recaptchaToken,
  })) as FeedbackSubmitResponse;

  if (!response.success || !response.feedbackId) {
    const message = response.error?.message ?? "Failed to submit feedback";
    throw new Error(message);
  }

  if (photo && response.uploadDetails) {
    await uploadAttachment(response.uploadDetails, photo);
    await callFunction("feedbackUploadComplete", {
      feedbackId: response.feedbackId,
      uploadId: response.uploadDetails.uploadId,
    });
  }

  return response;
}

export async function approveFeedback(feedbackId: string) {
  await callFunction("adminFeedbackApprove", { feedbackId });
}

export async function rejectFeedback(feedbackId: string) {
  await callFunction("adminFeedbackReject", { feedbackId });
}

// Admin: get signed upload URL for tour media, upload file, return download URL
export async function uploadTourMedia(tourId: string, file: File): Promise<string> {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Not authenticated');

  const payload = {
    tourId,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  };

  const resp = await callFunction(
    'adminTourUploadUrl',
    payload,
    { Authorization: `Bearer ${idToken}` }
  );

  const { success, uploadDetails, downloadUrl, error } = resp as {
    success: boolean;
    uploadDetails: UploadDetails;
    downloadUrl: string;
    error?: CloudFunctionError;
  };

  if (!success || !uploadDetails) {
    throw new Error(error?.message || 'Failed to get upload URL');
  }

  await uploadAttachment(uploadDetails, file);
  return downloadUrl;
}

export type ClientReview = Pick<Review, "id" | "authorDisplay" | "country" | "language" | "rating" | "message" | "tourId" | "tourName" | "photoUrls" | "createdAt" | "summary">;
