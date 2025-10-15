"use client";

import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

let appCheckInstance: AppCheck | null = null;
let initializationAttempted = false;

const APP_CHECK_WARNING =
  "Firebase App Check is not initialised because NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY is missing. App Check protected endpoints will reject requests in production.";

export function ensureAppCheck(firebaseApp: FirebaseApp): AppCheck | null {
  if (typeof window === "undefined") {
    console.log("ensureAppCheck: Running on server-side, skipping");
    return null;
  }

  if (appCheckInstance) {
    console.log("ensureAppCheck: Already initialized, returning existing instance");
    return appCheckInstance;
  }

  console.log("ensureAppCheck: First initialization attempt...");

  // Optional: enable App Check debug token via env flag.
  // Set NEXT_PUBLIC_APPCHECK_DEBUG=1 in .env.local to use debug tokens locally.
  if (process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "1") {
    console.log("ensureAppCheck: Debug mode enabled - setting FIREBASE_APPCHECK_DEBUG_TOKEN=true");
    const extendedWindow = window as typeof window & {
      FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean;
    };
    extendedWindow.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY;

  if (!siteKey) {
    if (!initializationAttempted) {
      console.error(APP_CHECK_WARNING);
      console.error("Current environment variables:", {
        hasAppCheckKey: !!process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY,
        appCheckDebug: process.env.NEXT_PUBLIC_APPCHECK_DEBUG
      });
      initializationAttempted = true;
    }
    return null;
  }

  console.log("ensureAppCheck: App Check key found, initializing with reCAPTCHA v3...");
  console.log("Site key (first 20 chars):", siteKey.substring(0, 20) + "...");

  try {
    // IMPORTANT: Using reCAPTCHA v3 provider to match Console configuration
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    initializationAttempted = true;
    console.log("✓ App Check instance created successfully");
    return appCheckInstance;
  } catch (error: any) {
    initializationAttempted = true;
    console.error("✗ Failed to initialise Firebase App Check:", {
      error: error?.message || error,
      code: error?.code,
      stack: error?.stack
    });
    console.error("Possible causes:");
    console.error("1. Invalid reCAPTCHA site key");
    console.error("2. Domain not allowlisted in Firebase Console > App Check");
    console.error("3. Network issues loading reCAPTCHA scripts");
    console.error("4. CORS or Content Security Policy blocking reCAPTCHA");
    return null;
  }
}

export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined") {
    console.warn("getAppCheckToken called on server-side (window is undefined)");
    return null;
  }

  if (!appCheckInstance) {
    console.error("App Check instance not initialized. Check if NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY is set and ensureAppCheck() was called.");
    return null;
  }

  try {
    console.log(`Requesting App Check token (forceRefresh: ${forceRefresh})...`);
    const result = await getToken(appCheckInstance, forceRefresh);

    if (!result?.token) {
      console.error("App Check token generation returned empty result:", result);
      return null;
    }

    console.log("✓ App Check token obtained successfully");
    return result.token;
  } catch (error: any) {
    console.error("Failed to fetch App Check token:", {
      error: error?.message || error,
      code: error?.code,
      stack: error?.stack
    });

    // If first attempt fails, try one more time with force refresh
    if (!forceRefresh) {
      console.log("Retrying with forceRefresh=true...");
      try {
        const retryResult = await getToken(appCheckInstance, true);
        if (retryResult?.token) {
          console.log("✓ App Check token obtained on retry");
          return retryResult.token;
        }
      } catch (retryError) {
        console.error("Retry also failed:", retryError);
      }
    }

    return null;
  }
}
