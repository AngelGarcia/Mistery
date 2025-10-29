'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import { FirebaseClientProvider } from './client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

type FirebaseContextValue = {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
};

const FirebaseContext = createContext<FirebaseContextValue>({ app: null, auth: null, firestore: null });

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      {(services) => (
        <FirebaseContext.Provider value={services}>
          {children}
          <FirebaseErrorListener />
        </FirebaseContext.Provider>
      )}
    </FirebaseClientProvider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);

export const useFirebaseApp = (): FirebaseApp | null => {
  const { app } = useFirebase();
  return app;
}

export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};
    