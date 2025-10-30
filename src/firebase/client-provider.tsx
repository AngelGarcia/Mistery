
'use client';
import { initializeFirebase } from ".";
import { FirebaseProvider, type FirebaseProviderProps } from "./provider";
import { useEffect, useState } from "react";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { Hourglass } from "lucide-react";

/**
 * Use the FirebaseClientProvider at the root of your app to
 * ensure Firebase is initialized once on the client.
 */
export function FirebaseClientProvider(props: React.PropsWithChildren) {
    const [firebase, setFirebase] = useState<{
        app?: FirebaseApp;
        auth?: Auth;
        firestore?: Firestore;
    } | null>(null);

    useEffect(() => {
        // Run this effect only on the client
        const { app, auth, firestore } = initializeFirebase();
        setFirebase({ app, auth, firestore });
    }, []);

    if (!firebase) {
        // You can render a loading state here
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Hourglass className="animate-spin" />
                <span className="ml-2">Conectando con la base de datos...</span>
            </div>
        );
    }

    const firebaseContext: FirebaseProviderProps = {
        ...firebase,
        children: props.children
    };
    
    return (<FirebaseProvider {...firebaseContext} />);
}
