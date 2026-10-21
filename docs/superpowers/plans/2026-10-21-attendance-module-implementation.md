# Employee Attendance Module Implementation Plan

**Design:** `../specs/2026-10-21-attendance-module-design.md`
**Status:** Implemented

## Work sequence

1. Extend the custom server Firestore helper with create-only document writes.
2. Protect the public ZKTeco route with the server-only serial allowlist, normalize Riyadh timestamps, preserve raw values, and rate-limit device heartbeat writes.
3. Add the independent `employees` Firestore model, domain hook, security rules, JSDoc, and Users-page management tab.
4. Add the attendance data hook and `/attendance` dashboard with Riyadh date selection, present/absent aggregation, raw punch details, and device status.
5. Add Sidebar navigation and Arabic/English translations.
6. Synchronize `AGENTS.md`, `.github/copilot-instructions.md`, and `README.md` with the implemented architecture and deployment requirements.
7. Validate changed files with targeted syntax/import checks and editor diagnostics. Per the approved spec's current validation instructions, do not run ESLint or a production build.

## Completion criteria

- Unknown serials receive HTTP 403 without Firebase client authentication being added to `/iclock/*`.
- Duplicate ATTLOG pushes cannot overwrite an existing raw event.
- New events preserve raw protocol fields and store a Riyadh-normalized Firestore timestamp.
- Admins can manage independent employee records and optional ZKTeco IDs.
- `/attendance` implements the exact zero-, one-, and multiple-punch behavior from the design.
- Device polling updates `lastSeenAt` no more often than the configured heartbeat interval.
- No payroll, lateness, scheduling, biometric enrollment, or daily calculated collection is introduced.

## Validation completed

- Node syntax checks passed for the changed JavaScript modules.
- VS Code diagnostics reported no errors in the changed source files.
- The Next.js development server compiled `/attendance`, which returned HTTP 200.
- Unknown-serial GET and POST requests to `/iclock/*` returned plain-text HTTP 403.
- The allowed production serial was not exercised locally, avoiding writes to the live Firebase project.
- ESLint and the production build were not run, per the approved design's current validation instructions.
