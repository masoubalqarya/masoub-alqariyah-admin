import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function stripBom(value) {
  return value.replace(/^\uFEFF/, "");
}

function unwrap(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizePrivateKey(key) {
  return unwrap(key).replace(/\\n/g, "\n").replace(/\r/g, "");
}

function parseServiceAccount(raw, source) {
  try {
    const trimmed = unwrap(
      stripBom(raw).replace(/^FIREBASE_SERVICE_ACCOUNT(_BASE64)?\s*=\s*/, ""),
    );
    const jsonText = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    const sa = JSON.parse(unwrap(stripBom(jsonText)));
    const projectId = sa.project_id?.trim();
    const clientEmail = sa.client_email?.trim();
    const privateKey = sa.private_key ? normalizePrivateKey(sa.private_key) : "";
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("missing project_id, client_email, or private_key");
    }
    return { projectId, clientEmail, privateKey };
  } catch (error) {
    console.error(`[firebase-admin] Failed to parse ${source}:`, error?.name || error);
    throw new Error(
      `Firebase Admin credentials invalid (${source}). Set FIREBASE_SERVICE_ACCOUNT_BASE64 to the base64 of the service-account JSON.`,
    );
  }
}

function getCredential() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    return parseServiceAccount(base64, "FIREBASE_SERVICE_ACCOUNT_BASE64");
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    return parseServiceAccount(json, "FIREBASE_SERVICE_ACCOUNT");
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    : "";
  if (clientEmail && privateKey) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID?.trim() || "masoub-alqarya",
      clientEmail,
      privateKey,
    };
  }

  return null;
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const credential = getCredential();
  if (!credential) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (preferred on Vercel), FIREBASE_SERVICE_ACCOUNT (JSON), or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  try {
    return initializeApp({
      credential: cert({
        projectId: credential.projectId,
        clientEmail: credential.clientEmail,
        privateKey: credential.privateKey,
      }),
      projectId: credential.projectId,
    });
  } catch (error) {
    console.error("[firebase-admin] initializeApp failed:", error?.code || error?.name);
    throw new Error(
      `Firebase Admin failed to initialize: ${error?.message || "unknown error"}`,
    );
  }
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  const app = getAdminApp();
  // Lazy-load Firestore so auth-only work does not pull gRPC into the function.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firestore = require("firebase-admin/firestore");
  try {
    return firestore.initializeFirestore(app, { preferRest: true });
  } catch {
    return firestore.getFirestore(app);
  }
}
