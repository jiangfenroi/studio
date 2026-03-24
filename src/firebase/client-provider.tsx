'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Ensure the application is at least anonymously authenticated
    // This allows the app to read configuration data like storage paths early.
    const { auth } = firebaseServices;
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        // Silently handle or propagate via central error emitter if needed
        // For prototype initialization, we just log to help with initial setup
        console.warn('Initial anonymous sign-in skipped or failed. Secure features may require manual login.');
      });
    }
  }, [firebaseServices]);

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