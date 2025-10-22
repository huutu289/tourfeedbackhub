/**
 * @file Post Versioning Cloud Functions
 *
 * Automatically save post versions on update and maintain version history
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

const db = admin.firestore();
const MAX_VERSIONS = 3;

/**
 * Cloud Function triggered when a post document is updated
 * Saves a version history entry and keeps only the last 3 versions
 */
export const savePostVersion = functions.firestore.onDocumentUpdated(
  {
    document: "posts/{postId}",
    region: "us-central1",
  },
  async (event) => {
    const postId = event.params.postId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.log("No data available for version tracking");
      return;
    }

    // Don't save version if only metadata fields changed
    const ignoredFields = ["updatedAt", "viewCount", "commentCount"];
    const hasContentChange = Object.keys(afterData).some((key) => {
      if (ignoredFields.includes(key)) return false;
      return JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]);
    });

    if (!hasContentChange) {
      console.log("No content changes detected, skipping version save");
      return;
    }

    try {
      // Create version entry
      const versionData = {
        postId,
        title: beforeData.title || "Untitled",
        content: beforeData.content || "",
        excerpt: beforeData.excerpt || "",
        authorId: beforeData.authorId || "unknown",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        changeNote: `Updated by ${afterData.authorName || "Unknown"}`,
        status: beforeData.status || "draft",
      };

      // Add version to subcollection
      await db
        .collection("posts")
        .doc(postId)
        .collection("versions")
        .add(versionData);

      // Get all versions for this post, sorted by creation date
      const versionsSnapshot = await db
        .collection("posts")
        .doc(postId)
        .collection("versions")
        .orderBy("createdAt", "desc")
        .get();

      // If we have more than MAX_VERSIONS, delete the oldest ones
      if (versionsSnapshot.size > MAX_VERSIONS) {
        const versionsToDelete = versionsSnapshot.docs.slice(MAX_VERSIONS);
        const batch = db.batch();
        versionsToDelete.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(
          `Deleted ${versionsToDelete.length} old versions for post ${postId}`
        );
      }

      console.log(`Saved version for post ${postId}`);
    } catch (error) {
      console.error("Error saving post version:", error);
      // Don't throw - we don't want to fail the main update
    }
  }
);

/**
 * HTTP Function to restore a post from a specific version
 */
export const restorePostVersion = functions.https.onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    const { postId, versionId } = request.data;

    if (!postId || !versionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "postId and versionId are required"
      );
    }

    // Check authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      // Get the version document
      const versionDoc = await db
        .collection("posts")
        .doc(postId)
        .collection("versions")
        .doc(versionId)
        .get();

      if (!versionDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Version not found"
        );
      }

      const versionData = versionDoc.data();
      if (!versionData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Version data not found"
        );
      }

      // Update the post with version data
      await db
        .collection("posts")
        .doc(postId)
        .update({
          title: versionData.title,
          content: versionData.content,
          excerpt: versionData.excerpt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          restoredFrom: versionId,
          restoredBy: request.auth.uid,
          restoredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(
        `Restored post ${postId} from version ${versionId} by user ${request.auth.uid}`
      );

      return {
        success: true,
        message: "Post restored from version successfully",
      };
    } catch (error: any) {
      console.error("Error restoring post version:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to restore version"
      );
    }
  }
);
