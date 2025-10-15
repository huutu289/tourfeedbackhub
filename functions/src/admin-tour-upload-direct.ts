/**
 * @file Admin Tour Direct Upload Cloud Function
 *
 * Direct file upload endpoint - receives file in request body and uploads to Cloud Storage
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

export const adminTourUploadDirect = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 20,
    memory: "512MiB",
    timeoutSeconds: 60,
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

      // Get payload from request body
      const payload = request.body as {
        tourId: string;
        fileName: string;
        contentType: string;
        size: number;
        fileData: string; // base64 encoded
      };

      if (!payload?.tourId || !payload?.fileName || !payload?.contentType || !payload?.fileData) {
        response.status(400).json({
          success: false,
          error: { code: "missing_fields", message: "tourId, fileName, contentType, fileData required" },
        });
        return;
      }

      const { tourId, fileName, contentType, fileData } = payload;

      console.log(`Uploading file: ${fileName}, type: ${contentType}, size: ${payload.size || 'unknown'}`);

      // Decode base64 to buffer
      const fileBuffer = Buffer.from(fileData, "base64");

      const storage = getStorage();
      const bucket = storage.bucket();

      const safeBaseName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
      const objectPath = `tours/${tourId}/${randomUUID()}_${safeBaseName}`;
      const fileRef = bucket.file(objectPath);

      // Generate a public download token
      const downloadToken = randomUUID();

      // Upload file to Cloud Storage with public token
      await fileRef.save(fileBuffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedBy: decoded.uid,
            uploadedAt: new Date().toISOString(),
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        public: true, // Make file public
      });

      // Use the Firebase Storage download URL with token
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

      console.log("Upload complete:", downloadUrl);

      response.status(200).json({
        success: true,
        downloadUrl,
      });
    } catch (error: any) {
      console.error("Error in adminTourUploadDirect:", error);
      response.status(500).json({ success: false, error: { code: "internal_error", message: error?.message || "Internal error" } });
    }
  }
);
