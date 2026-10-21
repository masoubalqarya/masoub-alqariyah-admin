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

function employeePayload(data) {
  return {
    displayName: data.displayName.trim(),
    zkUserId: data.zkUserId?.trim() || null,
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

export async function createEmployee(data) {
  const now = Timestamp.now();
  await addDoc(collection(db, "employees"), {
    ...employeePayload(data),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateEmployee(employeeId, data) {
  await updateDoc(doc(db, "employees", employeeId), {
    ...employeePayload(data),
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
