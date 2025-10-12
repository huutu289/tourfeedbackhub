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

      const bucket = admin.storage().bucket();
      const safeBaseName = payload.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
      const objectPath = `tours/${payload.tourId}/${randomUUID()}_${safeBaseName}`;
      const file = bucket.file(objectPath);

      let uploadUrl: string;
      try {
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        [uploadUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires,
          contentType: payload.contentType,
        });
      } catch (e: any) {
        console.error("getSignedUrl failed", { bucket: bucket.name, objectPath, error: e?.message || e });
        response.status(500).json({ success: false, error: { code: "sign_url_failed", message: "Could not create signed URL" } });
        return;
      }

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media`;

      response.status(200).json({
        success: true,
        uploadDetails: {
          uploadUrl,
          method: "PUT",
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
