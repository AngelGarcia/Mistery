
'use client';
import { createContext, useContext, type PropsWithChildren } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export interface FirebaseProviderProps extends PropsWithChildren {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const FirebaseContext = createContext<FirebaseProviderProps | undefined>(undefined);

export function FirebaseProvider({ children, ...props }: FirebaseProviderProps) {
  return (
    <FirebaseContext.Provider value={props}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

// Hooks to be used in client components
export const useFirebaseApp = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
      throw new Error('useFirebaseApp must be used within a FirebaseProvider');
    }
    return context.app;
};

export const useAuth = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a FirebaseProvider');
    }
    return context.auth;
};

export const useFirestore = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirestore must be used within a FirebaseProvider');
    }
    return context.firestore;
};

