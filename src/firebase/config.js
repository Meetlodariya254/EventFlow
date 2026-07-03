import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAX6kqk2qoTbhnYDXVbBGAD__AB-VVixW8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "remainder-agent.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "remainder-agent",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "remainder-agent.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "473979744191",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:473979744191:web:c96dccf1070ab1d8523b0a",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
