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

  try {
    const snapshot = await admin.firestore
      .collection("reviews")
      .where("reviewType", "==", "finishedTour")
      .get();

    const approved = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          tourId: data.tourId ?? tourId,
          authorName: data.authorDisplay ?? data.name ?? "Anonymous",
          rating: typeof data.rating === "number" ? data.rating : Number(data.rating) || 0,
          message: data.message ?? "",
          createdAt: toDate(data.createdAt ?? Date.now()),
          status: data.status ?? "pending",
        };
      })
      .filter((item) => item.tourId === tourId && item.status === "approved")
      .map(({ status: _status, ...rest }) => rest as FinishedTourComment);

    return approved.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Failed to load finished tour comments", error);
    return [];
  }
});
