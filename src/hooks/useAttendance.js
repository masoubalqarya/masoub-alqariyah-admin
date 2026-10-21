"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useEmployees } from "@/hooks/useEmployees";
import { db } from "@/lib/firebase";

export const ATTENDANCE_DEVICE_SERIAL = "NYU7253603435";
const CONNECTED_THRESHOLD_MS = 15 * 60 * 1000;

export function getRiyadhDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function nextDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function eventTimeLabel(event) {
  return event.eventTimeRaw?.slice(11, 16) || "--";
}

export function useAttendance(dateKey) {
  const { employees, loading: employeesLoading, error: employeesError } =
    useEmployees();
  const [events, setEvents] = useState([]);
  const [device, setDevice] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const start = `${dateKey} 00:00:00`;
      const end = `${nextDateKey(dateKey)} 00:00:00`;
      const eventsQuery = query(
        collection(db, "attendanceEvents"),
        where("eventTimeRaw", ">=", start),
        where("eventTimeRaw", "<", end),
      );
      const [eventsSnapshot, deviceSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDoc(doc(db, "attendanceDevices", ATTENDANCE_DEVICE_SERIAL)),
      ]);

      setEvents(
        eventsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      );
      const deviceData = deviceSnapshot.exists()
        ? { id: deviceSnapshot.id, ...deviceSnapshot.data() }
        : null;
      const lastSeenMs = deviceData?.lastSeenAt?.toMillis?.() || 0;

      setDevice(deviceData);
      setDeviceConnected(
        lastSeenMs > 0 && Date.now() - lastSeenMs <= CONNECTED_THRESHOLD_MS,
      );
    } catch (fetchError) {
      console.error("Attendance fetch error:", fetchError);
      setError(fetchError);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo(() => {
    const eventsByUser = new Map();

    for (const event of events) {
      const key = String(event.zkUserId || "");
      const current = eventsByUser.get(key) || [];
      current.push(event);
      eventsByUser.set(key, current);
    }

    return employees
      .filter((employee) => employee.isActive)
      .map((employee) => {
        const punches = employee.zkUserId
          ? [...(eventsByUser.get(String(employee.zkUserId)) || [])].sort(
              (a, b) => a.eventTimeRaw.localeCompare(b.eventTimeRaw),
            )
          : [];

        return {
          ...employee,
          punches,
          punchCount: punches.length,
          firstPunch: punches.length ? eventTimeLabel(punches[0]) : "--",
          lastPunch:
            punches.length > 1
              ? eventTimeLabel(punches[punches.length - 1])
              : "--",
          attendanceStatus: punches.length ? "present" : "absent",
        };
      });
  }, [employees, events]);

  return {
    rows,
    device,
    deviceConnected,
    loading: loading || employeesLoading,
    error: error || employeesError,
    refresh,
  };
}
