import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
    if (!sa?.client_email || !sa?.private_key) {
      throw new Error("missing client_email or private_key");
    }
    sa.private_key = normalizePrivateKey(sa.private_key);
    return sa;
  } catch (error) {
    console.error(`[firebase-admin] Failed to parse ${source}:`, error?.name || error);
    throw new Error(
      `Firebase Admin credentials invalid (${source}). Set FIREBASE_SERVICE_ACCOUNT_BASE64 to the base64 of the service-account JSON.`,
    );
  }
}

function getServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    return parseServiceAccount(base64, "FIREBASE_SERVICE_ACCOUNT_BASE64");
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    return parseServiceAccount(json, "FIREBASE_SERVICE_ACCOUNT");
  }

  return null;
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const sa = getServiceAccount();
  if (sa) {
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
        privateKey: normalizePrivateKey(privateKey),
      }),
    });
  }

  throw new Error(
    "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (preferred on Vercel), FIREBASE_SERVICE_ACCOUNT (JSON), or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
