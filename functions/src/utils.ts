/**
 * @file Utility functions for Cloud Functions
 */

import * as admin from "firebase-admin";
import type { Request } from "firebase-functions/v2/https";

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || "";
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY || "";
const RECAPTCHA_PROJECT_ID = process.env.GCLOUD_PROJECT || "";

// Rate limiting: Simple in-memory store (for production, use Redis/Firestore)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Verify App Check token from request headers
 */
export async function verifyAppCheck(request: Request): Promise<boolean> {
  const appCheckToken = request.headers["x-firebase-appcheck"] as string;

  if (!appCheckToken) {
    console.warn("Missing App Check token");
    return false;
  }

  try {
    await admin.appCheck().verifyToken(appCheckToken);
    return true;
  } catch (error) {
    console.error("App Check verification failed:", error);
    return false;
  }
}

/**
 * Verify reCAPTCHA Enterprise token
 */
export async function verifyRecaptcha(
  token: string,
  action: string = "submit_feedback",
  minScore: number = 0.7
): Promise<{ success: boolean; score?: number; reason?: string }> {
  if (!RECAPTCHA_API_KEY || !RECAPTCHA_PROJECT_ID) {
    console.warn("reCAPTCHA not configured, skipping verification");
    return { success: true, reason: "not_configured" };
  }

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: {
          token,
          expectedAction: action,
          siteKey: RECAPTCHA_SITE_KEY,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("reCAPTCHA API error:", response.status, errorText);
      return { success: false, reason: "api_error" };
    }

    const result = await response.json();
    const score = result.riskAnalysis?.score ?? 0;
    const valid = result.tokenProperties?.valid === true;

    if (!valid) {
      return { success: false, score, reason: "invalid_token" };
    }

    if (score < minScore) {
      return { success: false, score, reason: "low_score" };
    }

    return { success: true, score };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return { success: false, reason: "exception" };
  }
}

/**
 * Rate limiting based on IP address
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = `ip:${ip}`;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Detect and remove PII (Personal Identifiable Information)
 * - Email addresses
 * - Phone numbers
 * - URLs (except common domains)
 */
export function removePII(text: string): string {
  let sanitized = text;

  // Remove email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/gi, "[email removed]");

  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,3}\d{2,4}/g, "[phone removed]");

  // Remove suspicious URLs (not whitelisted domains)
  sanitized = sanitized.replace(
    /https?:\/\/(?!(?:www\.)?(youtube\.com|youtu\.be|facebook\.com|instagram\.com))[^\s]+/gi,
    "[URL removed]"
  );

  return sanitized;
}

/**
 * Validate file upload metadata
 */
export function validateFileMetadata(metadata: {
  fileName: string;
  contentType: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Different limits for images vs videos
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/jpg"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

  const isVideo = ALLOWED_VIDEO_TYPES.includes(metadata.contentType);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (metadata.size > maxSize) {
    const limitText = isVideo ? "100MB" : "10MB";
    return { valid: false, error: `File size exceeds ${limitText} limit` };
  }

  if (!ALLOWED_TYPES.includes(metadata.contentType)) {
    return { valid: false, error: "Invalid file type. Only JPEG, PNG, WebP, HEIC images and MP4, MOV, AVI, WebM videos are allowed" };
  }

  // Check for suspicious file names
  const suspiciousPatterns = [/\.\./, /[<>:"\/\\|?*]/, /\.exe$/, /\.sh$/, /\.bat$/];
  if (suspiciousPatterns.some((pattern) => pattern.test(metadata.fileName))) {
    return { valid: false, error: "Invalid file name" };
  }

  return { valid: true };
}

/**
 * Generate a safe display name from user input
 */
export function generateDisplayName(name: string, country: string): string {
  const sanitizedName = sanitizeInput(name);
  const sanitizedCountry = sanitizeInput(country);

  // Truncate name to first name only (max 20 chars)
  const firstName = sanitizedName.split(" ")[0].substring(0, 20);

  return `${firstName} from ${sanitizedCountry}`;
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}
