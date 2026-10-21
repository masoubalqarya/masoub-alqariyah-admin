# Dual-shift attendance and 28th–27th report design

**Date:** 2026-10-21  
**Status:** Approved for implementation planning

## Purpose and approved decisions

An attendance employee may work two required shifts on the same working day. Each shift has its own punches, presence, grace deadline, lateness, and optional correction. The report adds late minutes from both shifts. Assignments are limited to one Fajr-based and one Maghrib-based attendance template, with the employee's existing weekly days off applying to both. The report defaults to the most recently completed pay period, inclusive from the 28th of one month through the 27th of the next, and administrators may edit its start and end dates. The old cashier `shifts` history tab in Users and all POS clock-in/out functionality are removed; the POS order board remains.

The project has not launched. Existing employee or demo documents may be updated, but no Firestore data deletion is necessary. In particular, immutable SenseFace `attendanceEvents` and the public `/iclock` integration remain unchanged.

## Employee and shift data

- `employees.shiftIds` becomes the canonical ordered array of zero, one, or two distinct `shiftTemplates` document IDs. If there are two, they must be one Fajr and one Maghrib template. The create/edit form uses two optional selectors and prevents duplicates or two templates with the same prayer start.
- Existing employee documents with only `shiftId` remain readable as a one-shift assignment until saved. Saving writes `shiftIds`; any legacy `shiftId` may remain only as a compatibility hint for old corrections, never as a second assignment. No bulk migration or reset of the real terminal ID 1 is required.
- Employee-wide start/end minute offsets and weekly days off apply to both shifts. A template that becomes inactive still calculates for an employee already assigned to it.
- Raw events stay create-only. `attendanceDevices` and device connectivity are unaffected.

## Shift-aware calculations and corrections

- The daily attendance table displays one row per assigned shift, identified by employee plus shift. Each row shows that shift's first punch, last punch (`--` for one), punch count, late minutes, and status. A not-yet-completed shift must not be reported absent prematurely. Unassigned employees keep the existing raw calendar-day view.
- The existing Riyadh shift-window calculation is reused. If configured punch windows overlap on a date, show a configuration-conflict status for both shifts, exclude those shifts from report totals, and do not assign a raw event to both. Resolve the configuration rather than guessing which shift owns a punch. This is tested around midnight and the 90-minute buffers.
- New manual adjustments use `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}` and store `shiftId` in the document. The current admin-only Firestore rules still require a reason and author. Existing legacy `{employeeId}_{shiftDate}` adjustments apply only to the original single shift (`employee.shiftId`), not to both shifts. New adjustments never edit raw events.
- Daily summary counts are labeled as shifts, not employees, so one attended and one missed shift do not appear as a fully present employee.

## Custom report period

- Two date inputs replace the month selector. Both endpoints are inclusive, with a maximum supported range of 366 days; invalid or reversed ranges show a validation message and do not query Firestore.
- Before each 28th, the default is the last period that ended on a 27th. On and after the 28th, it advances to the period that ended the previous day. For example, on 2026-10-21 the default is 2026-08-28 through 2026-09-27; on 2026-10-28 it is 2026-09-28 through 2026-10-27.
- Fetch prayer calendars for every month touched by the chosen range through the existing authenticated prayer-time API. Query raw events and overrides once for the complete range (with the existing overnight raw-event buffer). There is no stored `attendanceDays` collection or new composite index.
- A shift counts in the report only when its expected end is in the past, its date is within the selected range and after employee creation, and it is an employee working day. Count working days as distinct dates; show scheduled, attended, missed, and late **shift** counts separately. Sum corrected late minutes from every eligible shift, then apply the existing Option B threshold to the total. Monthly detail groups shifts by date and names each shift.

## POS shift removal

- Remove the Users shift-history tab, its listener, formatter, and page-only imports.
- Remove the POS clock-in/out controls, active-shift listener, timer, handlers, and related loading dependency. Order filtering, status changes, notifications, language toggle, and logout remain unchanged.
- Once unused, remove `src/hooks/useShifts.js` and unused clock-in/out translations. Remove or deny the obsolete client `shifts` Firestore rule; do not delete historical `shifts` documents or affect `shiftTemplates`.

## Demo data update

- The existing upload button remains the only action that writes demo data. On rerun, update only documents marked `demoSeedId: "attendance-demo-v1"` to assign both a Fajr template and the demo Maghrib template; never overwrite a non-demo employee's mapping. Existing demo employees retain their original `shiftId` and gain the complementary shift. The selected Fajr template is used for new demo employees and existing night-only demo employees, not to rewrite an existing morning assignment.
- Append missing, deterministic synthetic punches for the second shift for August and September 2026 and the current month to date. Existing raw event documents are never edited or deleted. Keep varied on-time, late, absent, single-punch, four-punch, overnight, and correction cases. Existing 59/60/78-minute cases remain on the original shift; the added second shift is on time for those employees so report threshold checks remain interpretable.
- New demo corrections are shift-scoped. The existing tagged ID 9 legacy waiver remains applied to its original night shift, without double application. Repeated uploads remain safe.

## Validation and documentation

- Unit-test 28th–27th defaults, inclusive cross-month ranges, two-shift daily calculations, overlap behavior, one missed shift, corrected late-minute summation, and idempotent demo generation.
- Run targeted lint and the attendance test suite. The user opted out of builds during implementation. Inspect the daily and report UI in both English and Arabic if a browser is available.
- Update `AGENTS.md`, `README.md`, `.github/copilot-instructions.md`, JSDoc models, and locale keys with the implemented contract. Confirm no new environment variable or index is required. Do not modify `/iclock`.
