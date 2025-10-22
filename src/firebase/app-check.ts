"use client";

import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from "firebase/app-check";
import { getApp } from "firebase/app";

// App Check is completely disabled in development mode
// No debug token needed

let _appCheck: AppCheck | null | undefined;
let _tokenFetchErrorLogged = false; // Rate limit console warnings

/**
 * Environment-aware App Check initialization:
 * - PRODUCTION: Initializes with reCAPTCHA v3 and auto token refresh
 * - NON-PRODUCTION: Completely disabled - returns null
 */
export function getAppCheck(): AppCheck | null {
  // Server-side guard
  if (typeof window === "undefined") {
    return null;
  }

  // Return cached instance if already initialized
  if (_appCheck !== undefined) {
    return _appCheck ?? null;
  }

  const app = getApp();
  const isProd = process.env.NODE_ENV === "production";

  // Resolve reCAPTCHA site key from environment
  const key =
    process.env.NEXT_PUBLIC_RECAPTCHA_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY ||
    // @ts-expect-error - Vite fallback for repos that use import.meta.env
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_RECAPTCHA_KEY) ||
    "";

  // ═══════════════════════════════════════════════════════════
  // NON-PRODUCTION: Completely disable App Check
  // ═══════════════════════════════════════════════════════════
  if (!isProd) {
    console.log("🔓 App Check DISABLED in development mode");
    console.log("   → No reCAPTCHA or token validation required");
    _appCheck = null;
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTION: Initialize App Check with reCAPTCHA v3
  // ═══════════════════════════════════════════════════════════
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RECAPTCHA_KEY is missing in production.");
    console.error("   → Add to .env.local: NEXT_PUBLIC_RECAPTCHA_KEY=your_site_key");
    console.error("   → Get site key from Firebase Console > App Check > Web App");
    _appCheck = null;
    return null;
  }

  try {
    console.log("🔒 Initializing Firebase App Check (production mode)...");
    console.log("   → Domain:", window.location.hostname);
    console.log("   → Site key:", key.substring(0, 20) + "...");

    _appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(key),
      isTokenAutoRefreshEnabled: true,
    });

    console.log("✓ App Check initialized successfully");

    // Verify token fetch works (async, non-blocking)
    getToken(_appCheck, false)
      .then(() => {
        console.log("✓ App Check token obtained successfully");
      })
      .catch((tokenError) => {
        if (!_tokenFetchErrorLogged) {
          _tokenFetchErrorLogged = true; // Rate limit
          console.error("");
          console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.error("⚠️  App Check token fetch FAILED");
          console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.error("");
          console.error("Error:", tokenError?.message || tokenError);
          console.error("Code:", tokenError?.code);
          console.error("");
          console.error("🔧 TROUBLESHOOTING:");
          console.error("");
          console.error("1. CHECK DOMAIN ALLOWLIST");
          console.error(`   → Current domain: ${window.location.hostname}`);
          console.error("   → Go to Firebase Console > App Check > Web App");
          console.error("   → Under reCAPTCHA settings, add 'Allowed Domains':");
          console.error(`      ${window.location.hostname}`);
          console.error("      *.web.app");
          console.error("      *.firebaseapp.com");
          console.error("      (your custom domain)");
          console.error("");
          console.error("2. CHECK AD BLOCKER / FIREWALL");
          console.error("   → Ad blockers may block reCAPTCHA scripts");
          console.error("   → Check Network tab for failed requests to google.com/recaptcha");
          console.error("");
          console.error("3. CHECK SITE KEY");
          console.error(`   → Current key: ${key.substring(0, 20)}...`);
          console.error("   → Verify in Firebase Console > App Check > Web App");
          console.error("");
          console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.error("");
        }
      });

    return _appCheck;
  } catch (error: any) {
    console.error("❌ Failed to initialize Firebase App Check");
    console.error("Error:", error?.message || error);
    console.error("Code:", error?.code);
    _appCheck = null;
    return null;
  }
}

/**
 * Attempts to fetch an App Check token.
 * In development (debug mode), this will return null since App Check is bypassed.
 * In production, fetches a real reCAPTCHA token.
 */
export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // In development mode, App Check is completely disabled
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const appCheckInstance = getAppCheck();

  if (!appCheckInstance) {
    console.error("App Check instance not initialized. Check if NEXT_PUBLIC_RECAPTCHA_KEY is set.");
    return null;
  }

  try {
    const result = await getToken(appCheckInstance, forceRefresh);

    if (!result?.token) {
      console.error("App Check token generation returned empty result");
      return null;
    }

    return result.token;
  } catch (error: any) {
    console.error("Failed to fetch App Check token:", {
      error: error?.message || error,
      code: error?.code,
    });

    // Retry once with force refresh
    if (!forceRefresh) {
      try {
        const retryResult = await getToken(appCheckInstance, true);
        if (retryResult?.token) {
          return retryResult.token;
        }
      } catch (retryError) {
        // Silent fail on retry
      }
    }

    return null;
  }
}

/**
 * @deprecated Use getAppCheck() instead
 */
export function ensureAppCheck(): AppCheck | null {
  console.warn("ensureAppCheck() is deprecated. Use getAppCheck() instead.");
  return getAppCheck();
}
