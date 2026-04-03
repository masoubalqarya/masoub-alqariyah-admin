"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Real-time listener for shifts, optionally filtered by userId.
 */
export function useShifts(userId) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [orderBy("clockIn", "desc")];
    if (userId) {
      constraints.unshift(where("userId", "==", userId));
    }

    const q = query(collection(db, "shifts"), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setShifts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Shifts listener error:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [userId]);

  return { shifts, loading };
}

/**
 * Get the active shift for a user.
 */
export function useActiveShift(userId) {
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "shifts"),
      where("userId", "==", userId),
      where("isActive", "==", true),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const d = snapshot.docs[0];
          setActiveShift({ id: d.id, ...d.data() });
        } else {
          setActiveShift(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Active shift listener error:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [userId]);

  return { activeShift, loading };
}

/**
 * Clock in — start a new shift.
 */
export async function clockIn(userId, userName, restaurantId) {
  const shiftRef = await addDoc(collection(db, "shifts"), {
    userId,
    userName,
    restaurantId,
    clockIn: Timestamp.now(),
    clockOut: null,
    isActive: true,
  });
  return shiftRef.id;
}

/**
 * Clock out — end an active shift.
 */
export async function clockOut(shiftId) {
  const shiftRef = doc(db, "shifts", shiftId);
  await updateDoc(shiftRef, {
    clockOut: Timestamp.now(),
    isActive: false,
  });
}
