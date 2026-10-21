# Employee Attendance Module Design

**Date:** 2026-10-21  
**Status:** Approved for implementation planning

## Purpose

Add the first practical employee attendance workflow to the Masoub AlQarya admin panel while preserving the working ZKTeco SenseFace 2A T&A PUSH integration. The module will give administrators a small employee roster, map employees to terminal user IDs, show present/absent attendance for a selected Riyadh calendar date, and expose the raw punches needed to validate the device protocol.

This version intentionally excludes payroll, overtime, schedules, lateness, deductions, leave, biometric enrollment, check-in/check-out state machines, and calculated daily attendance documents.

## Existing Context

- The public device endpoint is `src/app/iclock/[...path]/route.js`.
- The terminal uses `GET /iclock/cdata`, `GET /iclock/getrequest`, and `POST /iclock/cdata?table=ATTLOG`.
- Raw events already use deterministic SHA-256 document IDs derived from the device serial and exact raw row.
- Server-side Firestore access uses the custom REST-backed helper in `src/lib/firebaseAdmin.js`.
- Authenticated portal users live in `users`, but they are login accounts rather than the restaurant employee roster.
- The existing `shifts` collection and UI are an unrelated legacy demo and remain unchanged so POS behavior is not affected.

## Data Model

### `employees/{employeeId}`

```js
{
  displayName: string,
  zkUserId: string | null,
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

- `displayName` is required.
- `zkUserId` is optional and stored as a trimmed string so values match the SenseFace terminal exactly.
- `isActive` controls inclusion in the attendance roster.
- Employee documents are independent of Firebase Auth and the `users` collection.

### `attendanceEvents/{eventId}`

New events contain:

```js
{
  deviceSerial: string,
  zkUserId: string,
  eventTimeRaw: string,
  eventTime: Timestamp | null,
  status: number | null,
  verifyType: number | null,
  workCode: string | null,
  source: "zkteco",
  deviceModel: "SenseFace 2A",
  raw: string,
  receivedAt: Timestamp,
}
```

- `eventTimeRaw` and `raw` are preserved exactly.
- `status`, `verifyType`, and `workCode` remain uninterpreted raw protocol values.
- `eventTime` is parsed from `YYYY-MM-DD HH:mm:ss` as fixed Asia/Riyadh time (UTC+3), never as browser-local time or UTC input.
- Invalid device date strings do not block raw ingestion; `eventTime` is stored as `null` and the raw value is retained.
- Existing events are never migrated or modified.

### `attendanceDevices/{serial}`

The existing device document remains the source of status:

```js
{
  serialNumber: string,
  provider: "zkteco",
  model: "SenseFace 2A",
  lastSeenAt: Timestamp,
}
```

## Device Ingestion and Security

The endpoint remains publicly accessible without Firebase client authentication. Every request must provide an `SN` or `sn` query parameter whose trimmed value appears in the server-only comma-separated `ZKTECO_ALLOWED_SERIALS` environment variable. Missing or unknown serials receive HTTP 403 before traffic is processed.

Meaningful `cdata` handshakes and uploads update `lastSeenAt`. Frequent `getrequest` polls check the stored timestamp and only write when it is missing or at least five minutes old. This preserves a useful heartbeat without writing on every poll. The UI considers the device connected when `lastSeenAt` is no more than fifteen minutes old.

The custom Firestore server helper gains a create-only document operation backed by the Firestore REST create endpoint. A duplicate deterministic event ID produces an already-exists result and is ignored. This makes raw event immutability safe even if duplicate pushes arrive concurrently; the current read-then-set race is removed.

## Employee Management

The existing `/users` page gains an Employees tab beside the existing Users and Shifts tabs. The new tab provides:

- Employee list
- Create employee dialog
- Edit employee dialog
- Required display name
- Optional bilingual-labeled Attendance Device ID field
- Active/inactive toggle
- Delete action with confirmation

Employee Firestore operations live in a focused `useEmployees` hook and follow the existing real-time hook and shadcn-style component patterns.

## Attendance Dashboard

Add an admin-only `/attendance` page and Sidebar link. The page contains:

- Date input defaulted to the current date in Asia/Riyadh
- Explicit refresh button
- Device status indicator for serial `NYU7253603435`
- Present and Absent summary cards
- Attendance table with Employee, First Punch, Last Punch, Number of Punches, and Status
- Clickable employee rows that open a dialog listing every punch for that day, including raw status and verification type

No Late card or lateness logic is added.

### Daily Query and Aggregation

The dashboard loads active employees and queries `attendanceEvents` by an `eventTimeRaw` range for the selected `YYYY-MM-DD` date. Lexical boundaries (`YYYY-MM-DD 00:00:00` to the next date) are safe for the terminal format and allow events ingested before the normalized `eventTime` field was introduced to remain visible.

Events are grouped by exact string equality between `attendanceEvents.zkUserId` and `employees.zkUserId`, then sorted by `eventTimeRaw`.

- Zero punches: absent, first and last punch are `--`.
- One punch: present, first punch is the event time, last punch is `--`.
- Two or more punches: present, first is earliest, last is latest.
- Punch count always equals the number of immutable raw events.
- Active employees without a mapping have no matching punches and therefore appear absent in version 1.

Refresh performs a new event and device read. Employee records remain live through their Firestore listener.

## Authorization and Firestore Rules

- `employees`: administrators may read and write.
- `attendanceEvents`: administrators may read; client writes are denied.
- `attendanceDevices`: administrators may read; client writes are denied.
- The server-side ZKTeco route continues to use service-account credentials and bypasses client rules.
- Cashier routing and POS access remain unchanged.

## Internationalization and UI

All new UI strings are added to both English and Arabic dictionaries. Layout uses logical start/end Tailwind utilities and existing Card, Table, Dialog, Badge, Button, Input, Label, Switch, and AlertDialog components. No new UI or date package is required.

## Failure Handling

- Unknown device serial: plain-text HTTP 403.
- Missing allowlist configuration: requests are rejected and a server error is logged without exposing configured serials.
- Malformed ATTLOG row missing user ID or raw event time: skip the row and continue processing the upload.
- Duplicate event: acknowledge the batch normally and do not mutate the existing document.
- Attendance query failure: show a translated error state and allow refresh.
- Device document missing or stale: show Disconnected rather than failing the page.

## Indexes

No composite Firestore index is required. The attendance query uses a range on the single `eventTimeRaw` field, which uses Firestore's automatic single-field index.

## Validation

Automated validation:

- Run ESLint.
- Run a production Next.js build.
- Check editor diagnostics for changed source files.

Manual validation:

1. Add `ZKTECO_ALLOWED_SERIALS=NYU7253603435` to Vercel and redeploy.
2. Create or edit one employee and set Attendance Device ID to `1`.
3. Fingerprint on the SenseFace device.
4. Confirm a new immutable `attendanceEvents` document contains the raw fields and normalized `eventTime`.
5. Open `/attendance` for the punch date and refresh.
6. Confirm the employee is Present, First Punch contains the device time, Last Punch is `--`, and Punch Count is 1.
7. Fingerprint again and refresh.
8. Confirm Punch Count increases and Last Punch shows the later punch.
9. Open the employee row and verify all raw punches, statuses, and verification types.
10. Replay the same raw device row and confirm no duplicate document is created or modified.
11. Call the endpoint with an unknown serial and confirm HTTP 403.

## Documentation Updates During Implementation

Implementation must keep `AGENTS.md`, `.github/copilot-instructions.md`, and `README.md` aligned with the new route, collections, server environment variable, employee model, dashboard behavior, and security rules.
