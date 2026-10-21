"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

function employeePayload(data, templates) {
  const startOffsetMinutes = Number(data.startOffsetMinutes || 0);
  const endOffsetMinutes = Number(data.endOffsetMinutes || 0);
  if (![startOffsetMinutes, endOffsetMinutes].every((value) => Number.isInteger(value) && Math.abs(value) <= 1440)) {
    throw new Error("Employee offsets must be whole minutes within one day");
  }
  const shiftIds = Array.isArray(data.shiftIds) ? data.shiftIds.filter(Boolean) : [];
  const assigned = shiftIds.map((id) => templates.find((template) => template.id === id));
  if (shiftIds.length > 2 || new Set(shiftIds).size !== shiftIds.length ||
    assigned.some((shift) => !shift) ||
    (assigned.length === 2 && new Set(assigned.map((shift) => shift.startPrayer)).size !== 2)) {
    throw new Error("Select at most one Fajr shift and one Maghrib shift");
  }
  return {
    displayName: data.displayName.trim(),
    zkUserId: data.zkUserId?.trim() || null,
    shiftIds,
    startOffsetMinutes,
    endOffsetMinutes,
    weeklyOffDays: Array.isArray(data.weeklyOffDays)
      ? [...new Set(data.weeklyOffDays)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
  };
}

export function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const employeesQuery = query(
      collection(db, "employees"),
      orderBy("displayName"),
    );
    const unsubscribe = onSnapshot(
      employeesQuery,
      (snapshot) => {
        setEmployees(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        );
        setError(null);
        setLoading(false);
      },
      (listenerError) => {
        console.error("Employees listener error:", listenerError);
        setError(listenerError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return { employees, loading, error };
}

export async function createEmployee(data, templates) {
  const now = Timestamp.now();
  await addDoc(collection(db, "employees"), {
    ...employeePayload(data, templates),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateEmployee(employeeId, data, templates) {
  await updateDoc(doc(db, "employees", employeeId), {
    ...employeePayload(data, templates),
    updatedAt: Timestamp.now(),
  });
}

export async function toggleEmployeeActive(employeeId, isActive) {
  await updateDoc(doc(db, "employees", employeeId), {
    isActive,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteEmployee(employeeId) {
  await deleteDoc(doc(db, "employees", employeeId));
}
