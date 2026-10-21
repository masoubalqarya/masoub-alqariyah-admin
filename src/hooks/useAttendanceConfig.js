"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DEFAULT_ATTENDANCE_SETTINGS = {
  monthlyLateThresholdMinutes: 60,
  deductionPolicy: "all_after_threshold",
  timezone: "Asia/Riyadh",
  prayerLocation: { city: "Jeddah", country: "Saudi Arabia" },
  prayerCalculationMethod: 4,
};

export function useAttendanceConfig() {
  const [shifts, setShifts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_ATTENDANCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let shiftsReady = false;
    let settingsReady = false;
    const ready = () => setLoading(!(shiftsReady && settingsReady));
    const stopShifts = onSnapshot(
      collection(db, "shiftTemplates"),
      (snapshot) => {
        setShifts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        shiftsReady = true;
        ready();
      },
      (listenerError) => {
        setError(listenerError);
        shiftsReady = true;
        ready();
      },
    );
    const stopSettings = onSnapshot(
      doc(db, "attendanceSettings", "default"),
      (snapshot) => {
        setSettings({ ...DEFAULT_ATTENDANCE_SETTINGS, ...(snapshot.data() || {}) });
        settingsReady = true;
        ready();
      },
      (listenerError) => {
        setError(listenerError);
        settingsReady = true;
        ready();
      },
    );
    return () => {
      stopShifts();
      stopSettings();
    };
  }, []);

  return { shifts, settings, loading, error };
}

function shiftPayload(data) {
  return {
    nameEn: data.nameEn.trim(),
    nameAr: data.nameAr.trim(),
    startType: "prayer",
    startPrayer: data.startPrayer,
    startOffsetMinutes: Number(data.startOffsetMinutes),
    endType: "fixed",
    endTime: data.endTime,
    endNextDay: Boolean(data.endNextDay),
    graceMinutes: Number(data.graceMinutes),
    active: Boolean(data.active),
    updatedAt: Timestamp.now(),
  };
}

export async function saveShiftTemplate(id, data) {
  const payload = shiftPayload(data);
  if (id) {
    await updateDoc(doc(db, "shiftTemplates", id), payload);
  } else {
    await addDoc(collection(db, "shiftTemplates"), {
      ...payload,
      createdAt: Timestamp.now(),
    });
  }
}

export async function saveAttendanceSettings(data) {
  await setDoc(
    doc(db, "attendanceSettings", "default"),
    {
      monthlyLateThresholdMinutes: Number(data.monthlyLateThresholdMinutes),
      deductionPolicy: "all_after_threshold",
      timezone: "Asia/Riyadh",
      prayerLocation: {
        city: data.prayerLocation.city.trim(),
        country: data.prayerLocation.country.trim(),
      },
      prayerCalculationMethod: Number(data.prayerCalculationMethod),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}
