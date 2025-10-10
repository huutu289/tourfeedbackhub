/**
 * @file Admin Generate Upload URL Cloud Function
 *
 * Generates a signed URL for admins to upload files directly to storage.
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Verify that the user is an admin
 */
async function verifyAdmin(request: admin.auth.DecodedIdToken | null): Promise<boolean> {
  if (!request) {
    return false;
  }
  return request.admin === true;
}

/**
 * Get ID token from Authorization header
 */
async function getAuthToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.substring(7);
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export const adminGenerateUploadUrl = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.set(CORS_HEADERS);
      response.status(204).send();
      return;
    }
    response.set(CORS_HEADERS);
    
    if (request.method !== "POST") {
      response.status(405).json({ success: false, error: { message: "Only POST requests are allowed" } });
      return;
    }

    try {
      const decodedToken = await getAuthToken(request.headers.authorization);
      if (!decodedToken || !(await verifyAdmin(decodedToken))) {
        response.status(403).json({ success: false, error: { message: "Admin access required" } });
        return;
      }

      const { fileName, fileType } = request.body;
      if (!fileName || !fileType) {
        response.status(400).json({ success: false, error: { message: "Missing fileName or fileType" } });
        return;
      }

      const bucket = getStorage().bucket();
      const file = bucket.file(fileName);
      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: fileType,
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      response.status(200).json({ success: true, uploadUrl, publicUrl });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      response.status(500).json({ success: false, error: { message: "Internal error" } });
    }
  }
);

    