import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

async function getCaller(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const profileSnap = await getAdminDb().collection("users").doc(decoded.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    if (!profile || profile.role !== "admin" || profile.isActive === false) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { uid: decoded.uid };
  } catch (error) {
    if (error.message?.includes("Firebase Admin")) {
      return {
        error: NextResponse.json({ error: error.message }, { status: 500 }),
      };
    }
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

export async function DELETE(request, { params }) {
  const { uid } = await params;
  if (!uid) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const caller = await getCaller(request);
  if (caller.error) return caller.error;

  if (caller.uid === uid) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      console.error("Auth delete failed:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete Auth account" },
        { status: 500 },
      );
    }
  }

  await db.collection("users").doc(uid).delete();

  return NextResponse.json({ ok: true });
}
