/**
 * @file Admin Story Direct Upload Cloud Function
 *
 * Direct file upload endpoint for story cover images.
 * Requires: App Check header and authenticated admin (custom claim admin: true).
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { verifyAppCheck } from "./utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Firebase-AppCheck, Authorization",
};

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

export const adminStoryUploadDirect = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 20,
    memory: "512MiB",
    timeoutSeconds: 60,
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

      const payload = request.body as {
        storyId: string;
        fileName: string;
        contentType: string;
        size: number;
        fileData: string;
      };

      if (!payload?.storyId || !payload?.fileName || !payload?.contentType || !payload?.fileData) {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "storyId, fileName, contentType, fileData required" },
        });
        return;
      }

      const { storyId, fileName, contentType, fileData } = payload;

      console.log(`Uploading cover image: ${fileName}, type: ${contentType}, size: ${payload.size || "unknown"}`);

      const fileBuffer = Buffer.from(fileData, "base64");

      const storage = getStorage();
      const bucket = storage.bucket();

      const safeBaseName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
      const objectPath = `stories/${storyId}/${randomUUID()}_${safeBaseName}`;
      const fileRef = bucket.file(objectPath);

      const downloadToken = randomUUID();

      await fileRef.save(fileBuffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedBy: decoded.uid,
            uploadedAt: new Date().toISOString(),
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        public: true,
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

      console.log("Story cover upload complete:", downloadUrl);

      response.status(200).json({
        success: true,
        downloadUrl,
      });
    } catch (error: any) {
      console.error("Error in adminStoryUploadDirect:", error);
      response
        .status(500)
        .json({ success: false, error: { code: "internal_error", message: error?.message || "Internal error" } });
    }
  }
);
