import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = getAdminDb();
const DEVICE_MODEL = "SenseFace 2A";
const HEARTBEAT_WRITE_INTERVAL_MS = 5 * 60 * 1000;

function textResponse(body, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function createEventId(serial, row) {
  return createHash("sha256").update(`${serial}:${row}`).digest("hex");
}

function getAllowedSerials() {
  return new Set(
    (process.env.ZKTECO_ALLOWED_SERIALS || "")
      .split(",")
      .map((serial) => serial.trim())
      .filter(Boolean),
  );
}

function getDeviceSerial(request) {
  return (
    request.nextUrl.searchParams.get("SN") ||
    request.nextUrl.searchParams.get("sn") ||
    ""
  ).trim();
}

function isAllowedSerial(serial) {
  const allowedSerials = getAllowedSerials();

  if (allowedSerials.size === 0) {
    console.error("[ZKTeco] ZKTECO_ALLOWED_SERIALS is not configured");
    return false;
  }

  return Boolean(serial) && allowedSerials.has(serial);
}

function parseRiyadhDeviceTime(value) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);

  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const timestamp = new Date(
    Date.UTC(year, month - 1, day, hour - 3, minute, second),
  );
  const localCheck = new Date(timestamp.getTime() + 3 * 60 * 60 * 1000);

  if (
    localCheck.getUTCFullYear() !== year ||
    localCheck.getUTCMonth() !== month - 1 ||
    localCheck.getUTCDate() !== day ||
    localCheck.getUTCHours() !== hour ||
    localCheck.getUTCMinutes() !== minute ||
    localCheck.getUTCSeconds() !== second
  ) {
    return null;
  }

  return timestamp;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function updateDeviceLastSeen(serial, force = false) {
  const ref = db.collection("attendanceDevices").doc(serial);

  if (!force) {
    const existing = await ref.get();
    const lastSeenAt = existing.data()?.lastSeenAt;
    const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : Number.NaN;

    if (
      Number.isFinite(lastSeenMs) &&
      Date.now() - lastSeenMs < HEARTBEAT_WRITE_INTERVAL_MS
    ) {
      return;
    }
  }

  await ref.set({
    serialNumber: serial,
    provider: "zkteco",
    model: DEVICE_MODEL,
    lastSeenAt: new Date(),
  });
}

async function getPath(params) {
  const resolved = await params;

  return resolved?.path?.join("/") || "";
}

// ============================================================
// GET
// ============================================================

export async function GET(request, { params }) {
  try {
    const path = await getPath(params);

    const serial = getDeviceSerial(request);

    if (!isAllowedSerial(serial)) {
      console.warn("[ZKTeco] Rejected GET from unknown device serial");
      return textResponse("FORBIDDEN", 403);
    }

    console.log("[ZKTeco GET]", {
      path,
      serial,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });

    // --------------------------------------------------------
    // Device handshake
    // --------------------------------------------------------

    if (path === "cdata" || path === "cdata.aspx") {
      await updateDeviceLastSeen(serial, true);

      return textResponse(
        `GET OPTION FROM: ${serial}
ATTLOGStamp=None
OPERLOGStamp=9999
TransTimes=00:00
TransInterval=1
TransFlag=TransData AttLog OpLog
Realtime=1
Encrypt=None`,
      );
    }

    // --------------------------------------------------------
    // Device polling for server commands
    // --------------------------------------------------------

    if (path === "getrequest" || path === "getrequest.aspx") {
      await updateDeviceLastSeen(serial);
      return textResponse("OK");
    }

    console.log("[ZKTeco] Unknown GET:", path);

    return textResponse("OK");
  } catch (error) {
    console.error("[ZKTeco GET ERROR]", error);

    return textResponse("ERROR", 500);
  }
}

// ============================================================
// POST
// ============================================================

export async function POST(request, { params }) {
  try {
    const path = await getPath(params);

    const serial = getDeviceSerial(request);

    if (!isAllowedSerial(serial)) {
      console.warn("[ZKTeco] Rejected POST from unknown device serial");
      return textResponse("FORBIDDEN", 403);
    }

    const table =
      request.nextUrl.searchParams.get("table")?.toUpperCase() || "";

    const body = await request.text();

    console.log("[ZKTeco POST]", {
      path,
      serial,
      table,
      body,
    });

    // --------------------------------------------------------
    // Device data upload
    // --------------------------------------------------------

    if (path === "cdata" || path === "cdata.aspx") {
      await updateDeviceLastSeen(serial, true);

      // ------------------------------------------------------
      // Attendance records
      // ------------------------------------------------------

      if (table === "ATTLOG") {
        const rows = body
          .split(/\r?\n/)
          .map((row) => row.trim())
          .filter(Boolean);

        let saved = 0;

        for (const row of rows) {
          const fields = row.split("\t");

          const [zkUserId, eventTimeRaw, status, verifyType, workCode] = fields;

          if (!zkUserId || !eventTimeRaw) {
            console.warn("[ZKTeco] Invalid attendance row:", row);

            continue;
          }

          // Same punch always gets same document ID.
          // This prevents duplicates.
          const eventId = createEventId(serial, row);

          const eventTime = parseRiyadhDeviceTime(eventTimeRaw);
          const ref = db.collection("attendanceEvents").doc(eventId);

          try {
            await ref.create({
              deviceSerial: serial,
              zkUserId: String(zkUserId),
              eventTimeRaw,
              eventTime,
              status: parseOptionalNumber(status),
              verifyType: parseOptionalNumber(verifyType),
              workCode: workCode || null,
              source: "zkteco",
              deviceModel: DEVICE_MODEL,
              raw: row,
              receivedAt: new Date(),
            });
          } catch (error) {
            if (error.code === "firestore/already-exists") {
              console.log("[ZKTeco] Duplicate ignored:", eventId);
              continue;
            }

            throw error;
          }

          saved++;
        }

        console.log(`[ZKTeco] Saved ${saved} attendance event(s)`);

        return textResponse(`OK: ${rows.length}`);
      }

      // For now just inspect anything else the device sends.
      console.log("[ZKTeco] Other cdata", {
        table,
        body,
      });

      return textResponse("OK");
    }

    // --------------------------------------------------------
    // Device command acknowledgement
    // --------------------------------------------------------

    if (path === "devicecmd" || path === "devicecmd.aspx") {
      console.log("[ZKTeco] Device command response:", body);

      return textResponse("OK");
    }

    console.log("[ZKTeco] Unknown POST", {
      path,
      body,
    });

    return textResponse("OK");
  } catch (error) {
    console.error("[ZKTeco POST ERROR]", error);

    return textResponse("ERROR", 500);
  }
}
