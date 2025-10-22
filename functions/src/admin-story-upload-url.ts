/**
 * @file Admin Story Upload URL Cloud Function
 *
 * Returns a signed URL to upload a story cover image to Cloud Storage.
 * Requires: App Check header and authenticated admin (custom claim admin: true).
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { verifyAppCheck, validateFileMetadata } from "./utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Firebase-AppCheck, Authorization",
};

interface UploadRequestPayload {
  storyId: string;
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

export const adminStoryUploadUrl = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 20,
    memory: "256MiB",
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.set(CORS_HEADERS).status(204).send("");
      return;
    }

    response.set(CORS_HEADERS);

    if (request.method !== "POST") {
      response
        .status(405)
        .json({ success: false, error: { code: "method_not_allowed", message: "Only POST allowed" } });
      return;
    }

    try {
      const appCheckOk = await verifyAppCheck(request as any);
      if (!appCheckOk) {
        response
          .status(403)
          .json({ success: false, error: { code: "app_check_failed", message: "App Check failed" } });
        return;
      }

      const decoded = await getDecodedToken(request.headers.authorization as string | undefined);
      if (!decoded || decoded.admin !== true) {
        response
          .status(403)
          .json({ success: false, error: { code: "forbidden", message: "Admin access required" } });
        return;
      }

      const payload = request.body as UploadRequestPayload;
      if (!payload?.storyId || !payload?.fileName || !payload?.contentType || typeof payload.size !== "number") {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "storyId, fileName, contentType, size required" },
        });
        return;
      }

      const validation = validateFileMetadata({
        fileName: payload.fileName,
        contentType: payload.contentType,
        size: payload.size,
      });

      if (!validation.valid) {
        response
          .status(400)
          .json({ success: false, error: { code: "invalid_file", message: validation.error || "Invalid file" } });
        return;
      }

      const storage = getStorage();
      const bucket = storage.bucket();

      const safeBaseName = payload.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
      const objectPath = `stories/${payload.storyId}/${randomUUID()}_${safeBaseName}`;
      const file = bucket.file(objectPath);

      let uploadUrl: string;
      try {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

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

        const bucketName = bucket.name;
        uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodeURIComponent(objectPath)}&uploadType=media`;
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
      console.error("Error in adminStoryUploadUrl:", error);
      response
        .status(500)
        .json({ success: false, error: { code: "internal_error", message: "Internal error" } });
    }
  }
);
