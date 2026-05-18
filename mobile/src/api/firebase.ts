import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app'; 
import { getFirestore, Firestore } from 'firebase/firestore'; 
import { getAuth, initializeAuth, Auth } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js');

const firebaseConfig = { 
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCXYMDhgaXpjSA9cZ8yW614Kz_d71EJ1_E", 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "ap-2-final.firebaseapp.com", 
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "ap-2-final", 
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "ap-2-final.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "210428553289",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:210428553289:android:42f179620ed50930eb7798"
}; 

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  // Always try to initialize Auth with persistence first!
  // This must run before getAuth() is ever called.
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e: any) {
  // If it throws an "already initialized" error during Expo's fast refresh, we catch it
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

export { auth, db };
export default app;
