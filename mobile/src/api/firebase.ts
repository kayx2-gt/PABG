import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app'; 
import { getFirestore, Firestore } from 'firebase/firestore'; 
import { getAuth, initializeAuth, Auth } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js');

const firebaseConfig = { 
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, 
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
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
