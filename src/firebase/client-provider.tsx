"use client";

import { useState, useEffect, ReactNode, useMemo } from 'react';
import { initializeFirebase } from '.';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';

type FirebaseServices = {
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
};

// This provider is responsible for initializing Firebase on the client side.
// It ensures that Firebase is initialized only once.
export function FirebaseClientProvider({ children, ...props }: { children: (services: FirebaseServices) => ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // Firebase should only be initialized on the client.
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices);
  }, []);

  const memoizedChildren = useMemo(() => {
    if (services) {
      return children(services);
    }
    return null; // Or a loading indicator
  }, [services, children]);

  return memoizedChildren;
}

    