"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useAttendanceOverrides(startDate, endDate, enabled = true) {
  const [overrides, setOverrides] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const requestKey = `${startDate}|${endDate}|${revision}`;
  const loading = enabled && loadedKey !== requestKey;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getDocs(
      query(
        collection(db, "attendanceOverrides"),
        where("shiftDate", ">=", startDate),
        where("shiftDate", "<", endDate),
      ),
    )
      .then((snapshot) => {
        if (!cancelled) {
          setOverrides(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          setError(null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, enabled, revision, requestKey]);

  return { overrides, loading, error, refresh: () => setRevision((value) => value + 1) };
}

export async function saveAttendanceOverride({ employeeId, shiftDate, adjustedFirstPunch, adjustedLastPunch, waivedLateMinutes, reason, adjustedBy }) {
  if (!reason?.trim()) throw new Error("Adjustment reason is required");
  const waiver = Number(waivedLateMinutes || 0);
  if (!Number.isFinite(waiver) || waiver < 0 || !Number.isInteger(waiver)) {
    throw new Error("Invalid waived minutes");
  }
  const corrections = {
    ...(adjustedFirstPunch ? { adjustedFirstPunch } : {}),
    ...(adjustedLastPunch ? { adjustedLastPunch } : {}),
    ...(waiver > 0 ? { waivedLateMinutes: waiver } : {}),
  };
  if (Object.keys(corrections).length === 0) throw new Error("An adjustment is required");
  await setDoc(doc(db, "attendanceOverrides", `${employeeId}_${shiftDate}`), {
    employeeId,
    shiftDate,
    type: "manual",
    ...corrections,
    reason: reason.trim(),
    adjustedBy,
    adjustedAt: Timestamp.now(),
  });
}
