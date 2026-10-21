"use client";

import { collection, doc, getDocs, runTransaction, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { dateKeyInRiyadh } from "@/lib/attendance/calculations";
import { DEMO_EMPLOYEES, DEMO_NIGHT_SHIFT_ID, DEMO_SEED_ID, demoEmployeeId } from "@/lib/attendance/demoSeed";

const seedCreatedAt = Timestamp.fromDate(new Date("2026-08-01T00:00:00+03:00"));

async function createIfMissing(ref, data) {
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      if (existing.data().demoSeedId !== DEMO_SEED_ID) {
        throw new Error(`Existing document is not demo data: ${ref.path}`);
      }
      return false;
    }
    transaction.set(ref, data);
    return true;
  });
}

export async function uploadAttendanceDemoSeed(morningShiftId, onProgress) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");
  const employeesSnapshot = await getDocs(collection(db, "employees"));
  const assignedIds = new Set(employeesSnapshot.docs
    .filter((item) => item.data().demoSeedId !== DEMO_SEED_ID)
    .map((item) => String(item.data().zkUserId || "")));
  const skippedIds = DEMO_EMPLOYEES.filter((employee) => assignedIds.has(employee.zkUserId)).map((employee) => employee.zkUserId);

  onProgress("Creating demo night shift and employees");
  await createIfMissing(doc(db, "shiftTemplates", DEMO_NIGHT_SHIFT_ID), {
    nameEn: "Demo Night Shift", nameAr: "الوردية الليلية التجريبية",
    startType: "prayer", startPrayer: "Maghrib", startOffsetMinutes: 15,
    endType: "fixed", endTime: "02:00", endNextDay: true, graceMinutes: 10,
    active: true, demoSeedId: DEMO_SEED_ID,
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  for (const employee of DEMO_EMPLOYEES) {
    if (assignedIds.has(employee.zkUserId)) continue;
    await createIfMissing(doc(db, "employees", demoEmployeeId(employee.zkUserId)), {
      displayName: employee.displayName, zkUserId: employee.zkUserId,
      shiftId: employee.shift === "night" ? DEMO_NIGHT_SHIFT_ID : morningShiftId,
      startOffsetMinutes: employee.startOffsetMinutes,
      endOffsetMinutes: employee.endOffsetMinutes,
      weeklyOffDays: employee.weeklyOffDays,
      isActive: true, demoSeedId: DEMO_SEED_ID,
      createdAt: seedCreatedAt, updatedAt: Timestamp.now(),
    });
  }

  const today = dateKeyInRiyadh();
  const months = [[2026, 8], [2026, 9]];
  if (today >= "2026-10-01") months.push([Number(today.slice(0, 4)), Number(today.slice(5, 7))]);
  let created = 0;
  let existing = 0;
  for (const [year, month] of months) {
    onProgress(`Loading prayer times for ${year}-${String(month).padStart(2, "0")}`);
    const prayerResponse = await fetch(`/api/attendance/prayer-times?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!prayerResponse.ok) throw new Error(`Prayer times unavailable (${prayerResponse.status})`);
    for (const employee of DEMO_EMPLOYEES) {
      if (assignedIds.has(employee.zkUserId)) continue;
      onProgress(`Uploading ${year}-${String(month).padStart(2, "0")} · ID ${employee.zkUserId}`);
      const response = await fetch("/api/attendance/demo-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year, month, zkUserId: employee.zkUserId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Demo upload failed (${response.status})`);
      created += result.created;
      existing += result.existing;
    }
  }
  return { created, existing, skippedIds };
}
