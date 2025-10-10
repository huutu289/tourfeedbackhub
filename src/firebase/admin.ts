import { cert, initializeApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: AdminApp | undefined;
}

interface FirebaseAdminServices {
  app: AdminApp;
  firestore: Firestore;
  storage: Storage;
}

function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // Return null instead of throwing, so the caller can handle the fallback.
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function initializeFirebaseAdmin(): FirebaseAdminServices | null {
  if (global.__FIREBASE_ADMIN_APP__) {
    const app = global.__FIREBASE_ADMIN_APP__;
    return {
      app,
      firestore: getFirestore(app),
      storage: getStorage(app),
    };
  }

  const credentials = buildCredential();
  if (!credentials) {
    return null; // Gracefully fail if credentials are not available.
  }

  try {
    global.__FIREBASE_ADMIN_APP__ = initializeApp({
      credential: cert(credentials),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  
    const app = global.__FIREBASE_ADMIN_APP__;
    return {
      app,
      firestore: getFirestore(app),
      storage: getStorage(app),
    };
  } catch (error) {
    console.warn("Firebase Admin initialization failed", error);
    return null;
  }
}
