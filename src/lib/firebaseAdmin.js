import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    const sa = JSON.parse(json);
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || "masoub-alqarya",
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "masoub-alqarya",
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  throw new Error(
    "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
