import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-cPjn2-lyQo9vgpd62qBcWgA28Pux0Ew",
  authDomain: "masoub-alqarya.firebaseapp.com",
  projectId: "masoub-alqarya",
  storageBucket: "masoub-alqarya.firebasestorage.app",
  messagingSenderId: "868982936652",
  appId: "1:868982936652:web:337e59659e4b8b1642d0e9",
  measurementId: "G-TEPBL70C7E",
};

// Initialize Firebase (prevent duplicate initialization in dev hot-reload)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
