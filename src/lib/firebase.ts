// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'studio-7956312296-90b9d',
  appId: '1:28472885242:web:040ebde3ece9f341daae43',
  apiKey: 'AIzaSyBf2ONh7iZGK5xLMrcx_9fZLgU8ETBG3TI',
  authDomain: 'studio-7956312296-90b9d.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '28472885242',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// The distinction between getFirestore and initializeFirestore is that
// initializeFirestore won't throw an error if the database doesn't exist.
// This allows us to gracefully handle the error in the UI.
const db = initializeFirestore(app, {});

export { app, db };

    