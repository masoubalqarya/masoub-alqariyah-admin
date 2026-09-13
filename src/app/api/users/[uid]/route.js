import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error, status) {
  return NextResponse.json({ error }, { status });
}

function isCredentialError(error) {
  const message = error?.message || "";
  return message.includes("Firebase Admin") || message.includes("credential");
}

async function getCaller(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return { error: jsonError("Unauthorized", 401) };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const profileSnap = await getAdminDb().collection("users").doc(decoded.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    if (!profile || profile.role !== "admin" || profile.isActive === false) {
      return { error: jsonError("Forbidden", 403) };
    }
    return { uid: decoded.uid };
  } catch (error) {
    console.error("[api/users] authorize failed:", error?.code || error?.name, error?.message);
    if (isCredentialError(error)) {
      return { error: jsonError(error.message, 500) };
    }
    const code = error?.code || "";
    if (
      code === "auth/argument-error" ||
      code === "auth/id-token-expired" ||
      code === "auth/id-token-revoked" ||
      code === "auth/invalid-id-token"
    ) {
      return { error: jsonError("Unauthorized", 401) };
    }
    return { error: jsonError(error?.message || "Failed to authorize delete", 500) };
  }
}

export async function DELETE(request, { params }) {
  try {
    const { uid } = await params;
    if (!uid) {
      return jsonError("Missing user id", 400);
    }

    const caller = await getCaller(request);
    if (caller.error) return caller.error;

    if (caller.uid === uid) {
      return jsonError("You cannot delete your own account", 400);
    }

    try {
      await getAdminAuth().deleteUser(uid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.error("[api/users] Auth delete failed:", error?.code || error?.message);
        return jsonError(error.message || "Failed to delete Auth account", 500);
      }
    }

    try {
      await getAdminDb().collection("users").doc(uid).delete();
    } catch (error) {
      console.error("[api/users] Firestore delete failed:", error?.code || error?.message);
      return jsonError(error.message || "Failed to delete user profile", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/users] DELETE failed:", error?.code || error?.name, error?.message);
    return jsonError(error?.message || "Failed to delete user", 500);
  }
}
