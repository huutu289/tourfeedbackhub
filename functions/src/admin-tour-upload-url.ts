/**
 * @file Admin Tour Upload URL Cloud Function
 *
 * Returns a V4 signed URL to upload a tour image to Cloud Storage.
 * Requires: App Check header and authenticated admin (custom claim admin: true).
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import { verifyAppCheck, validateFileMetadata } from "./utils";
import { getStorage } from "firebase-admin/storage";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Firebase-AppCheck, Authorization",
};

interface UploadRequestPayload {
  tourId: string;
  fileName: string;
  contentType: string;
  size: number;
}

async function getDecodedToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.substring(7);
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    console.error("Auth token verification failed", e);
    return null;
  }
}

export const adminTourUploadUrl = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 20,
    memory: "256MiB",
  },
  async (request, response) => {
    // CORS preflight
    if (request.method === "OPTIONS") {
      response.set(CORS_HEADERS).status(204).send("");
      return;
    }

    response.set(CORS_HEADERS);

    if (request.method !== "POST") {
      response.status(405).json({ success: false, error: { code: "method_not_allowed", message: "Only POST allowed" } });
      return;
    }

    try {
      // App Check
      const appCheckOk = await verifyAppCheck(request as any);
      if (!appCheckOk) {
        response.status(403).json({ success: false, error: { code: "app_check_failed", message: "App Check failed" } });
        return;
      }

      // Admin auth
      const decoded = await getDecodedToken(request.headers.authorization as string | undefined);
      if (!decoded || decoded.admin !== true) {
        response.status(403).json({ success: false, error: { code: "forbidden", message: "Admin access required" } });
        return;
      }

      const payload = request.body as UploadRequestPayload;
      if (!payload?.tourId || !payload?.fileName || !payload?.contentType || typeof payload.size !== "number") {
        response.status(400).json({ success: false, error: { code: "missing_fields", message: "tourId, fileName, contentType, size required" } });
        return;
      }

      // Validate file
      const validation = validateFileMetadata({ fileName: payload.fileName, contentType: payload.contentType, size: payload.size });
      if (!validation.valid) {
        response.status(400).json({ success: false, error: { code: "invalid_file", message: validation.error || "Invalid file" } });
        return;
      }

      // Get default bucket
      const storage = getStorage();
      const bucket = storage.bucket();

      const safeBaseName = payload.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
      const objectPath = `tours/${payload.tourId}/${randomUUID()}_${safeBaseName}`;
      const file = bucket.file(objectPath);

      let uploadUrl: string;
      try {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now

        // Try to get signed URL
        const [url] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: expiresAt,
          contentType: payload.contentType,
        });
        uploadUrl = url;
      } catch (e: any) {
        console.error("getSignedUrl failed - falling back to public upload token", {
          bucket: bucket.name,
          objectPath,
          error: e?.message || e,
          stack: e?.stack,
        });

        // Fallback: Use Firebase Storage REST API upload URL
        const bucketName = bucket.name;
        uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodeURIComponent(objectPath)}&uploadType=media`;

        console.log("Using fallback upload URL", { uploadUrl, objectPath });
      }

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media`;

      response.status(200).json({
        success: true,
        uploadDetails: {
          uploadUrl,
          method: uploadUrl.includes("uploadType=media") ? "POST" : "PUT",
          headers: { "Content-Type": payload.contentType },
          uploadId: objectPath,
        },
        objectPath,
        downloadUrl,
      });
    } catch (error) {
      console.error("Error in adminTourUploadUrl:", error);
      response.status(500).json({ success: false, error: { code: "internal_error", message: "Internal error" } });
    }
  }
);
