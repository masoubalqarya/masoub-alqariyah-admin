import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { fetchPrayerMonth } from "@/lib/attendance/prayerProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  prayerLocation: { city: "Jeddah", country: "Saudi Arabia" },
  prayerCalculationMethod: 4,
};
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

async function authorize(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const profile = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!profile.exists || profile.data().role !== "admin" || profile.data().isActive === false) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { uid: decoded.uid };
  } catch (error) {
    console.error("[prayer-times] authorization failed:", error);
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

async function getSettings(db) {
  const snapshot = await db.collection("attendanceSettings").doc("default").get();
  const saved = snapshot.data() || {};
  return {
    prayerLocation: {
      city: saved.prayerLocation?.city || DEFAULT_SETTINGS.prayerLocation.city,
      country: saved.prayerLocation?.country || DEFAULT_SETTINGS.prayerLocation.country,
    },
    prayerCalculationMethod: Number(saved.prayerCalculationMethod || 4),
  };
}

function configurationKey(settings) {
  return [
    settings.prayerLocation.city.toLowerCase(),
    settings.prayerLocation.country.toLowerCase(),
    settings.prayerCalculationMethod,
  ].join("|");
}

function datesForMonth(year, month) {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  );
}

export async function GET(request) {
  const caller = await authorize(request);
  if (caller.error) return caller.error;
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const settings = await getSettings(db);
    const key = configurationKey(settings);
    const dates = datesForMonth(year, month);
    const snapshots = await Promise.all(
      dates.map((date) => db.collection("prayerTimes").doc(date).get()),
    );
    const needsProvider = snapshots.some((snapshot) =>
      !snapshot.exists || (!snapshot.data().override && snapshot.data().configurationKey !== key),
    );
    const providerDays = needsProvider
      ? await fetchPrayerMonth(year, month, settings)
      : null;

    const days = await Promise.all(dates.map(async (date, index) => {
      const snapshot = snapshots[index];
      if (snapshot.exists && (snapshot.data().override || snapshot.data().configurationKey === key)) {
        return snapshot.data();
      }
      const times = providerDays.get(date);
      if (!times) throw new Error(`Prayer provider omitted ${date}`);
      const record = {
        date,
        ...times,
        source: "aladhan",
        calculationMethod: settings.prayerCalculationMethod,
        city: settings.prayerLocation.city,
        country: settings.prayerLocation.country,
        configurationKey: key,
        fetchedAt: new Date(),
        override: false,
      };
      const ref = db.collection("prayerTimes").doc(date);
      try {
        if (snapshot.exists) {
          await ref.set(record, { updateTime: snapshot.updateTime });
        } else {
          await ref.create(record);
        }
        return record;
      } catch (error) {
        if (error.code === "firestore/already-exists" || error.code === "firestore/precondition-failed") {
          const latest = await ref.get();
          if (latest.exists) return latest.data();
        }
        throw error;
      }
    }));

    return NextResponse.json({ days, settings });
  } catch (error) {
    console.error("[prayer-times] monthly load failed:", error);
    return NextResponse.json({ error: "Prayer times unavailable" }, { status: 502 });
  }
}

export async function PATCH(request) {
  const caller = await authorize(request);
  if (caller.error) return caller.error;
  try {
    const body = await request.json();
    const date = String(body.date || "");
    const reason = String(body.reason || "").trim();
    const fajr = body.fajr === undefined ? undefined : String(body.fajr);
    const maghrib = body.maghrib === undefined ? undefined : String(body.maghrib);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !reason ||
      (fajr === undefined && maghrib === undefined) ||
      (fajr !== undefined && !timePattern.test(fajr)) ||
      (maghrib !== undefined && !timePattern.test(maghrib))) {
      return NextResponse.json({ error: "Invalid prayer-time adjustment" }, { status: 400 });
    }
    const ref = getAdminDb().collection("prayerTimes").doc(date);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Load the prayer date before adjusting it" }, { status: 404 });
    }
    const fields = {
      override: true,
      overrideReason: reason,
      adjustedBy: caller.uid,
      adjustedAt: new Date(),
    };
    if (fajr !== undefined) fields.fajr = fajr;
    if (maghrib !== undefined) fields.maghrib = maghrib;
    await ref.set(fields, { updateTime: snapshot.updateTime });
    const latest = await ref.get();
    return NextResponse.json({ day: latest.data() });
  } catch (error) {
    if (error.code === "firestore/precondition-failed") {
      return NextResponse.json({ error: "Prayer time changed; refresh and retry" }, { status: 409 });
    }
    console.error("[prayer-times] adjustment failed:", error);
    return NextResponse.json({ error: "Unable to adjust prayer time" }, { status: 500 });
  }
}
