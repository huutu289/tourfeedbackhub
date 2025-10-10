"use client";

import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken, type AppCheck } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

let appCheckInstance: AppCheck | null = null;
let initializationAttempted = false;

const APP_CHECK_WARNING =
  "Firebase App Check is not initialised because NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY is missing. App Check protected endpoints will reject requests in production.";

export function ensureAppCheck(firebaseApp: FirebaseApp): AppCheck | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (appCheckInstance) {
    return appCheckInstance;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY;

  if (!siteKey) {
    if (!initializationAttempted) {
      console.warn(APP_CHECK_WARNING);
      initializationAttempted = true;
    }
    return null;
  }

  try {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    initializationAttempted = true;
    return appCheckInstance;
  } catch (error) {
    initializationAttempted = true;
    console.error("Failed to initialise Firebase App Check", error);
    return null;
  }
}

export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined" || !appCheckInstance) {
    return null;
  }

  try {
    const result = await getToken(appCheckInstance, forceRefresh);
    return result?.token ?? null;
  } catch (error) {
    console.warn("Unable to fetch App Check token", error);
    return null;
  }
}
