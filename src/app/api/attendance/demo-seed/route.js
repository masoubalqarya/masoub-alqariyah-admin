import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { dateKeyInRiyadh, isWorkingDay } from "@/lib/attendance/calculations";
import { DEMO_EMPLOYEES, DEMO_NIGHT_SHIFT_ID, DEMO_SEED_ID, demoDates, demoEmployeeId, planDemoPunches } from "@/lib/attendance/demoSeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rawDeviceTime(date) {
  return new Date(date.getTime() + 3 * 60 * 60_000).toISOString().slice(0, 19).replace("T", " ");
}

async function authorize(request, db) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const profile = await db.collection("users").doc(decoded.uid).get();
    return profile.exists && profile.data().role === "admin" && profile.data().isActive !== false
      ? decoded.uid : null;
  } catch {
    return null;
  }
}

async function createEvent(db, zkUserId, instant) {
  const eventTimeRaw = rawDeviceTime(instant);
  const raw = `${zkUserId}\t${eventTimeRaw}\t255\t1\t0\t0\t0\t0\t0\t0`;
  const id = createHash("sha256").update(`${DEMO_SEED_ID}|${raw}`).digest("hex");
  try {
    await db.collection("attendanceEvents").doc(`demo-${id}`).create({
      deviceSerial: "DEMO-SEED", zkUserId, eventTimeRaw,
      eventTime: instant, status: 255, verifyType: 1, workCode: "0",
      source: "demo", deviceModel: "Synthetic Demo", raw,
      receivedAt: new Date(), demoSeedId: DEMO_SEED_ID,
    });
    return true;
  } catch (error) {
    if (error.code === "firestore/already-exists") return false;
    throw error;
  }
}

async function createWaiver(db, employeeId, date, shiftId, uid) {
  const legacy = await db.collection("attendanceOverrides").doc(`${employeeId}_${date}`).get();
  if (legacy.exists) return;
  try {
    await db.collection("attendanceOverrides").doc(`${employeeId}_${date}_${shiftId}`).create({
      employeeId, shiftDate: date, shiftId, type: "manual", waivedLateMinutes: 20,
      reason: "Demo: approved 20-minute waiver", adjustedBy: uid,
      adjustedAt: new Date(), demoSeedId: DEMO_SEED_ID,
    });
  } catch (error) {
    if (error.code !== "firestore/already-exists") throw error;
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { year, month, zkUserId } = body;
  const today = dateKeyInRiyadh();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const validMonth = year === 2026 && (month === 8 || month === 9) ||
    year === currentYear && month === currentMonth && today >= "2026-10-01";
  if (!validMonth || !DEMO_EMPLOYEES.some((item) => item.zkUserId === zkUserId)) {
    return NextResponse.json({ error: "Invalid demo seed request" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const uid = await authorize(request, db);
    if (!uid) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const employeeId = demoEmployeeId(zkUserId);
    const employeeDoc = await db.collection("employees").doc(employeeId).get();
    if (!employeeDoc.exists || employeeDoc.data().demoSeedId !== DEMO_SEED_ID ||
      employeeDoc.data().zkUserId !== zkUserId || !employeeDoc.data().isActive) {
      return NextResponse.json({ error: "Demo employee is missing or inactive" }, { status: 409 });
    }
    const employee = employeeDoc.data();
    const definition = DEMO_EMPLOYEES.find((item) => item.zkUserId === zkUserId);
    if (definition.shift === "night" && employee.shiftId !== DEMO_NIGHT_SHIFT_ID) {
      return NextResponse.json({ error: "Demo night shift was changed" }, { status: 409 });
    }
    const shiftIds = employee.shiftIds;
    if (!Array.isArray(shiftIds) || shiftIds.length !== 2 ||
      !shiftIds.includes(employee.shiftId) || new Set(shiftIds).size !== 2) {
      return NextResponse.json({ error: "Demo employee needs two assigned shifts" }, { status: 409 });
    }
    const shiftDocs = await Promise.all(shiftIds.map((id) => db.collection("shiftTemplates").doc(id).get()));
    if (shiftDocs.some((item) => !item.exists)) return NextResponse.json({ error: "Assigned shift is missing" }, { status: 409 });
    const shifts = shiftDocs.map((item, index) => ({ id: shiftIds[index], ...item.data() }));
    if (new Set(shifts.map((shift) => shift.startPrayer)).size !== 2 ||
      shifts.some((shift) => shift.startType !== "prayer" || shift.endType !== "fixed") ||
      !shifts.some((shift) => shift.id === DEMO_NIGHT_SHIFT_ID) ||
      shifts.find((shift) => shift.id === employee.shiftId)?.startPrayer !== (definition.shift === "night" ? "Maghrib" : "Fajr")) {
      return NextResponse.json({ error: "Assigned shift is incompatible with demo data" }, { status: 409 });
    }

    const dates = demoDates(year, month, today);
    const prayerDocs = await Promise.all(dates.map((date) => db.collection("prayerTimes").doc(date).get()));
    if (prayerDocs.some((item) => !item.exists)) {
      return NextResponse.json({ error: "Load monthly prayer times before seeding" }, { status: 409 });
    }
    const now = new Date();
    const punches = [];
    let workingIndex = 0;
    let firstWorkingDate = null;
    for (let index = 0; index < dates.length; index++) {
      const date = dates[index];
      if (!isWorkingDay(employee, date)) continue;
      if (!firstWorkingDate) firstWorkingDate = date;
      for (const shift of shifts) {
        punches.push(...planDemoPunches({ employee, shift, date,
          prayers: prayerDocs[index].data(), workingIndex, now,
          isSecondary: shift.id !== employee.shiftId }));
      }
      workingIndex++;
    }
    let created = 0;
    let existing = 0;
    for (let index = 0; index < punches.length; index += 8) {
      const results = await Promise.all(punches.slice(index, index + 8)
        .map((instant) => createEvent(db, zkUserId, instant)));
      created += results.filter(Boolean).length;
      existing += results.filter((result) => !result).length;
    }
    if (zkUserId === "9" && firstWorkingDate) await createWaiver(db, employeeId, firstWorkingDate, employee.shiftId, uid);
    return NextResponse.json({ created, existing });
  } catch (error) {
    console.error("[attendance-demo-seed] upload failed:", error);
    return NextResponse.json({ error: "Demo attendance upload failed" }, { status: 500 });
  }
}
