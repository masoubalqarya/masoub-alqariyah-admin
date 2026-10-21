import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = getAdminDb();

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

    const serial =
      request.nextUrl.searchParams.get("SN") ||
      request.nextUrl.searchParams.get("sn") ||
      "unknown";

    console.log("[ZKTeco GET]", {
      path,
      serial,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });

    // --------------------------------------------------------
    // Device handshake
    // --------------------------------------------------------

    if (path === "cdata" || path === "cdata.aspx") {
      await db.collection("attendanceDevices").doc(serial).set({
        serialNumber: serial,
        provider: "zkteco",
        model: "SenseFace 2A",
        lastSeenAt: new Date(),
      });

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

    const serial =
      request.nextUrl.searchParams.get("SN") ||
      request.nextUrl.searchParams.get("sn") ||
      "unknown";

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
      await db.collection("attendanceDevices").doc(serial).set({
        serialNumber: serial,
        provider: "zkteco",
        model: "SenseFace 2A",
        lastSeenAt: new Date(),
      });

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

          const ref = db.collection("attendanceEvents").doc(eventId);

          const existing = await ref.get();

          if (existing.exists) {
            console.log("[ZKTeco] Duplicate ignored:", eventId);

            continue;
          }

          await ref.set({
            deviceSerial: serial,
            zkUserId: String(zkUserId),
            eventTimeRaw,

            status:
              status !== undefined && status !== "" ? Number(status) : null,

            verifyType:
              verifyType !== undefined && verifyType !== ""
                ? Number(verifyType)
                : null,

            workCode: workCode || null,

            source: "zkteco",
            deviceModel: "SenseFace 2A",

            raw: row,

            receivedAt: new Date(),
          });

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
