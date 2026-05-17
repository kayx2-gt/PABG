import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = path.join(__dirname, '../../ap-2-final-firebase-adminsdk-fbsvc-ee2591ada7.json');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log("Firebase Admin initialized successfully using JSON file.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    admin.initializeApp();
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const increment = admin.firestore.FieldValue.increment;
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
