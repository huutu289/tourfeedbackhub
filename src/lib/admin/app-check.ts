import { getAppCheckToken } from "@/firebase/app-check";

/**
 * Ensures an App Check token is available before performing Firestore writes.
 * Provides detailed error messages to aid debugging.
 */
export async function requireAppCheckToken(): Promise<string> {
  console.log("requireAppCheckToken: Starting App Check token validation...");

  const token = await getAppCheckToken();

  if (!token) {
    const errorMessage =
      "App Check token could not be obtained. " +
      "This is required for Firestore write operations. " +
      "Check browser console for detailed App Check errors. " +
      "Common causes: reCAPTCHA not loading, App Check misconfiguration, or network issues.";

    console.error("requireAppCheckToken: FAILED -", errorMessage);
    throw new Error(errorMessage);
  }

  console.log("requireAppCheckToken: SUCCESS - Token obtained");
  return token;
}

