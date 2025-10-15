import { cache } from "react";
import { initializeFirebaseAdmin } from "@/firebase/admin";
import type { FinishedTourComment } from "@/lib/types";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export const getFinishedTourComments = cache(async (tourId: string): Promise<FinishedTourComment[]> => {
  const admin = initializeFirebaseAdmin();
  if (!admin) return [];

  const snapshot = await admin.firestore
    .collection("tours")
    .doc(tourId)
    .collection("comments")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      tourId,
      authorName: data.authorName ?? data.name ?? "Anonymous",
      rating: typeof data.rating === "number" ? data.rating : Number(data.rating) || 0,
      message: data.message ?? "",
      createdAt: toDate(data.createdAt ?? Date.now()),
    } satisfies FinishedTourComment;
  });
});

