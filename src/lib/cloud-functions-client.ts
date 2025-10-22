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

async function uploadAttachment(upload: UploadDetails, file: File, authToken?: string) {
  const method = upload.method ?? "PUT";
  const headers = new Headers(upload.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type);
  }

  // Add Firebase Auth token if uploading to Firebase Storage REST API
  if (authToken && upload.uploadUrl.includes('firebasestorage.googleapis.com')) {
    headers.set("Authorization", `Bearer ${authToken}`);

    // Also add App Check token for Firebase Storage
    const appCheckToken = await getAppCheckToken();
    if (appCheckToken) {
      headers.set("X-Firebase-AppCheck", appCheckToken);
    }
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

// Admin: upload tour media directly to Cloud Storage
export async function uploadTourMedia(tourId: string, file: File): Promise<string> {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    console.log('Uploading file:', { tourId, fileName: file.name, size: file.size, type: file.type });

    // For files < 8MB, use base64 direct upload (avoids App Check issues with Storage REST API)
    // For larger files, fall back to signed URL approach
    const useDirectUpload = file.size < 8 * 1024 * 1024; // 8MB threshold

    if (useDirectUpload) {
      console.log('Using direct upload (base64)');

      // Read file as base64
      const fileBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Use direct upload endpoint with base64 payload
      const response = await callFunction(
        'adminTourUploadDirect',
        {
          tourId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          fileData: base64Data,
        },
        { Authorization: `Bearer ${idToken}` }
      );

      if (!response.success || !response.downloadUrl) {
        throw new Error(response.error?.message || 'Upload failed');
      }

      console.log('File uploaded successfully:', response.downloadUrl);
      return response.downloadUrl;
    } else {
      console.log('Using signed URL upload (file too large for base64)');

      // Request a signed upload URL for large files
      const response = await callFunction(
        'adminTourUploadUrl',
        {
          tourId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        },
        { Authorization: `Bearer ${idToken}` }
      );

      if (!response.success || !response.uploadDetails || !response.downloadUrl) {
        throw new Error(response.error?.message || 'Upload failed');
      }

      // Upload with auth token and App Check
      await uploadAttachment(response.uploadDetails, file, idToken);

      console.log('File uploaded successfully:', response.downloadUrl);
      return response.downloadUrl as string;
    }
  } catch (error) {
    console.error('uploadTourMedia error:', error);
    if (error instanceof Error) {
      throw new Error(`File upload failed for "${file.name}": ${error.message}`);
    }
    throw error;
  }
}

export async function uploadStoryCover(storyId: string, file: File): Promise<string> {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    const useDirectUpload = file.size < 8 * 1024 * 1024;

    if (useDirectUpload) {
      const fileBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await callFunction(
        'adminStoryUploadDirect',
        {
          storyId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          fileData: base64Data,
        },
        { Authorization: `Bearer ${idToken}` }
      );

      if (!response.success || !response.downloadUrl) {
        throw new Error(response.error?.message || 'Upload failed');
      }

      return response.downloadUrl as string;
    } else {
      const response = await callFunction(
        'adminStoryUploadUrl',
        {
          storyId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        },
        { Authorization: `Bearer ${idToken}` }
      );

      if (!response.success || !response.uploadDetails || !response.downloadUrl) {
        throw new Error(response.error?.message || 'Upload failed');
      }

      await uploadAttachment(response.uploadDetails, file, idToken);

      return response.downloadUrl as string;
    }
  } catch (error) {
    console.error('uploadStoryCover error:', error);
    if (error instanceof Error) {
      throw new Error(`Cover upload failed for "${file.name}": ${error.message}`);
    }
    throw error;
  }
}

export type ClientReview = Pick<Review, "id" | "authorDisplay" | "country" | "language" | "rating" | "message" | "tourId" | "tourName" | "photoUrls" | "createdAt" | "summary">;
