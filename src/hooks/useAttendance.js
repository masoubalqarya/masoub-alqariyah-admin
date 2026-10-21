"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { addDays, dateKeyInRiyadh, dateKeysInRange } from "@/lib/attendance/calculations";

export const ATTENDANCE_DEVICE_SERIAL = "NYU7253603435";
const CONNECTED_THRESHOLD_MS = 15 * 60 * 1000;

export const getRiyadhDateKey = dateKeyInRiyadh;

export function useAttendanceEvents(startDate, endDate, enabled = true) {
  const [events, setEvents] = useState([]);
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
        collection(db, "attendanceEvents"),
        where("eventTimeRaw", ">=", `${addDays(startDate, -1)} 00:00:00`),
        where("eventTimeRaw", "<", `${addDays(endDate, 1)} 00:00:00`),
      ),
    )
      .then((snapshot) => {
        if (!cancelled) {
          setEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
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

  return { events, loading, error, refresh: () => setRevision((value) => value + 1) };
}

export function useAttendanceDevice() {
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getDoc(doc(db, "attendanceDevices", ATTENDANCE_DEVICE_SERIAL));
      const data = snapshot.exists() ? snapshot.data() : null;
      const lastSeen = data?.lastSeenAt?.toMillis?.() || 0;
      setDevice(data);
      setConnected(lastSeen > 0 && Date.now() - lastSeen <= CONNECTED_THRESHOLD_MS);
    } catch (error) {
      console.error("Attendance device load failed:", error);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "attendanceDevices", ATTENDANCE_DEVICE_SERIAL))
      .then((snapshot) => {
        if (cancelled) return;
        const data = snapshot.exists() ? snapshot.data() : null;
        const lastSeen = data?.lastSeenAt?.toMillis?.() || 0;
        setDevice(data);
        setConnected(lastSeen > 0 && Date.now() - lastSeen <= CONNECTED_THRESHOLD_MS);
      })
      .catch((error) => console.error("Attendance device load failed:", error));
    return () => { cancelled = true; };
  }, []);

  return { device, connected, refresh };
}

export function usePrayerMonth(year, month, enabled = true, configurationKey = "") {
  const [days, setDays] = useState({});
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const requestKey = `${year}|${month}|${configurationKey}|${revision}`;
  const loading = enabled && loadedKey !== requestKey;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`/api/attendance/prayer-times?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Prayer times request failed (${response.status})`);
      const body = await response.json();
      return Object.fromEntries(body.days.map((day) => [day.date, day]));
    }
    load()
      .then((data) => {
        if (!cancelled) {
          setDays(data);
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
  }, [year, month, enabled, configurationKey, revision, requestKey]);

  return { days, loading, error, refresh: () => setRevision((value) => value + 1) };
}

export function usePrayerRange(startDate, endDate, enabled = true, configurationKey = "") {
  const [days, setDays] = useState({});
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const requestKey = `${startDate}|${endDate}|${configurationKey}|${revision}`;
  const loading = enabled && loadedKey !== requestKey;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const months = [...new Set(dateKeysInRange(startDate, endDate, 368).map((date) => date.slice(0, 7)))];
      const calendars = await Promise.all(months.map(async (key) => {
        const [year, month] = key.split("-").map(Number);
        const response = await fetch(`/api/attendance/prayer-times?year=${year}&month=${month}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Prayer times request failed (${response.status})`);
        return (await response.json()).days;
      }));
      return Object.fromEntries(calendars.flat().map((day) => [day.date, day]));
    }
    load()
      .then((data) => { if (!cancelled) { setDays(data); setError(null); } })
      .catch((fetchError) => { if (!cancelled) setError(fetchError); })
      .finally(() => { if (!cancelled) setLoadedKey(requestKey); });
    return () => { cancelled = true; };
  }, [startDate, endDate, enabled, configurationKey, revision, requestKey]);

  return { days, loading, error, refresh: () => setRevision((value) => value + 1) };
}

export async function savePrayerOverride({ date, fajr, maghrib, reason }) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");
  const response = await fetch("/api/attendance/prayer-times", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ date, fajr, maghrib, reason }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Unable to save prayer override");
  }
}
