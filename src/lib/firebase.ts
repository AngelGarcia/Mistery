// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);

export { app, db };

    