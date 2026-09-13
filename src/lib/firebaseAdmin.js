import { createSign, createVerify } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedAccessToken = null;
let cachedCerts = null;

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

function adminError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
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

export function getCredential() {
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

function requireCredential() {
  const credential = getCredential();
  if (!credential) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (preferred on Vercel), FIREBASE_SERVICE_ACCOUNT (JSON), or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }
  return credential;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken(credential) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp > now + 60) {
    return cachedAccessToken.token;
  }

  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = toBase64Url(
    JSON.stringify({
      iss: credential.clientEmail,
      scope: [
        "https://www.googleapis.com/auth/identitytoolkit",
        "https://www.googleapis.com/auth/datastore",
      ].join(" "),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(credential.privateKey, "base64url")}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("[firebase-admin] token exchange failed:", data.error || res.status);
    throw new Error(
      `Firebase Admin failed to initialize: ${data.error_description || data.error || res.status}`,
    );
  }

  cachedAccessToken = {
    token: data.access_token,
    exp: now + Number(data.expires_in || 3600),
  };
  return cachedAccessToken.token;
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function getSecureTokenCerts() {
  const now = Date.now();
  if (cachedCerts && cachedCerts.exp > now) return cachedCerts.certs;

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Firebase Admin failed to fetch token certs (${res.status})`);
  }
  const certs = await res.json();
  const maxAge = Number(
    /max-age=(\d+)/.exec(res.headers.get("cache-control") || "")?.[1] || 3600,
  );
  cachedCerts = { certs, exp: now + maxAge * 1000 };
  return certs;
}

async function verifyIdToken(idToken, credential) {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw adminError("auth/argument-error", "Invalid ID token");
  }

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw adminError("auth/id-token-expired", "ID token expired");
  }
  if (payload.nbf && payload.nbf > now + 60) {
    throw adminError("auth/argument-error", "ID token not yet valid");
  }
  if (payload.aud !== credential.projectId) {
    throw adminError("auth/argument-error", "Unexpected ID token audience");
  }
  if (payload.iss !== `https://securetoken.google.com/${credential.projectId}`) {
    throw adminError("auth/argument-error", "Unexpected ID token issuer");
  }

  const uid = payload.sub || payload.user_id;
  if (!uid) {
    throw adminError("auth/argument-error", "ID token missing subject");
  }

  const certs = await getSecureTokenCerts();
  const cert = header.kid ? certs[header.kid] : null;
  if (!cert) {
    throw adminError("auth/argument-error", "ID token signing key not found");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  if (!verifier.verify(cert, parts[2], "base64url")) {
    throw adminError("auth/argument-error", "Invalid ID token signature");
  }

  return { uid, ...payload };
}

function unwrapFirestoreValue(value) {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    return unwrapFirestoreFields(value.mapValue.fields);
  }
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(unwrapFirestoreValue);
  }
  return null;
}

function unwrapFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, unwrapFirestoreValue(value)]),
  );
}

async function firestoreGet(credential, collection, id) {
  const token = await getAccessToken(credential);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(credential.projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) {
    return { exists: false, data: () => null };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Firestore get failed (${res.status})`);
  }
  return { exists: true, data: () => unwrapFirestoreFields(data.fields) };
}

async function firestoreDelete(credential, collection, id) {
  const token = await getAccessToken(credential);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(credential.projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Firestore delete failed (${res.status})`);
  }
}

async function deleteAuthUser(credential, uid) {
  const token = await getAccessToken(credential);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(credential.projectId)}/accounts:delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid }),
    },
  );
  const data = await res.json().catch(() => ({}));
  const message = data.error?.message || "";
  if (res.status === 400 && /USER_NOT_FOUND/i.test(message)) {
    throw adminError("auth/user-not-found", "User not found");
  }
  if (!res.ok) {
    throw new Error(message || `Auth delete failed (${res.status})`);
  }
}

export function getAdminAuth() {
  const credential = requireCredential();
  return {
    verifyIdToken: (idToken) => verifyIdToken(idToken, credential),
    deleteUser: (uid) => deleteAuthUser(credential, uid),
  };
}

export function getAdminDb() {
  const credential = requireCredential();
  return {
    collection: (collection) => ({
      doc: (id) => ({
        get: () => firestoreGet(credential, collection, id),
        delete: () => firestoreDelete(credential, collection, id),
      }),
    }),
  };
}
