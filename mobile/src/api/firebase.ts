import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app'; 
import { getFirestore, Firestore } from 'firebase/firestore'; 
import { getAuth, initializeAuth, Auth } from 'firebase/auth'; 
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = { 
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyB-4paYlt6JhzXBC98_PfjKHeRFDa6I778", 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "ap-2-final.firebaseapp.com", 
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "ap-2-final", 
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "ap-2-final.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "210428553289",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:210428553289:web:7cf05ec7bf629584eb7798",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-63CYR3ZR6Z"
}; 

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

export { auth, db };
export default app;
