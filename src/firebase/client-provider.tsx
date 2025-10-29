
'use client';
import { initializeFirebase } from ".";
import { FirebaseProvider, type FirebaseProviderProps } from "./provider";

/**
 * Use the FirebaseClientProvider at the root of your app to
 * ensure Firebase is initialized once on the client.
 */
export function FirebaseClientProvider(props: React.PropsWithChildren) {
    const { app, auth, firestore } = initializeFirebase();
    const firebaseContext: FirebaseProviderProps = {
        app,
        auth,
        firestore,
        children: props.children
    };
    return (<FirebaseProvider {...firebaseContext} />);
}
