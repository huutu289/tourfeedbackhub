'use client';

import React, { useEffect, useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { ensureAppCheck } from '@/firebase/app-check';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    console.log('FirebaseClientProvider: Initializing App Check...');
    console.log('Environment:', {
      hasAppCheckKey: !!process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY,
      appCheckDebug: process.env.NEXT_PUBLIC_APPCHECK_DEBUG,
      nodeEnv: process.env.NODE_ENV
    });

    const appCheck = ensureAppCheck(firebaseServices.firebaseApp);

    if (appCheck) {
      console.log('✓ App Check initialized successfully');
      console.log('App Check provider:', appCheck);
    } else {
      console.error('✗ App Check failed to initialize - check the console for errors above');
      console.error('Without App Check, write operations to Firestore will fail');
    }
  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}