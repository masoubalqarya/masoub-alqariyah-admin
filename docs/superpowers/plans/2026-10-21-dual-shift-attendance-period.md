# Dual-shift attendance and report-period implementation plan

**Approved spec:** [dual-shift attendance design](../specs/2026-10-21-dual-shift-attendance-period-design.md)

## 1. Pure calculations first

- Add failing tests in `src/lib/attendance/calculations.test.mjs` for two required shifts on one working date, one absent shift, two independently late shifts, a one-punch shift, post-midnight departure, overlapping buffered windows, and corrected late-minute totals.
- Extend `src/lib/attendance/calculations.js` with a normalized assigned-shift-ID helper (read `shiftIds`, fall back to legacy `shiftId`), a per-employee/date multi-shift evaluator, and explicit conflict state for overlapping punch windows. Keep the existing one-shift function intact for current tests. Make daily and report consumers use the new evaluator so a raw punch cannot be counted in two shifts.
- Add tests for a completed 28th–27th period, inclusive custom date iteration, and invalid/reversed/overlong ranges. Implement pure date-range helpers in the same module or a small focused module.
- Run `node --experimental-default-type=module --test src/lib/attendance/calculations.test.mjs` and fix until green.

## 2. Employee assignments and shift-scoped corrections

- Update `src/hooks/useEmployees.js` to validate zero to two distinct `shiftIds` and, for two, the Fajr/Maghrib pairing against available templates. Continue reading legacy `shiftId` but write `shiftIds` on save. Do not bulk-change real employees.
- Replace the single shift selector with up to two selectors in `src/app/users/page.jsx`; show both shift names in the roster. Inactive templates remain selectable only if already assigned. Keep employee device ID uniqueness validation.
- Update `src/hooks/useAttendanceOverrides.js` to accept `shiftId` and write `{employeeId}_{shiftDate}_{shiftId}` with the existing reason/author fields. In attendance calculations, look up a shift-scoped correction first; use an old date-only correction only for the employee's original legacy shift. Tests prove that one waiver cannot affect both shifts.
- Update JSDoc in `src/types/index.js` and bilingual labels/errors in `src/lib/i18n/en.js` and `ar.js`.

## 3. Daily and custom-range report

- Add a `usePrayerRange` hook in `src/hooks/useAttendance.js` that calls the existing authenticated monthly prayer endpoint for each distinct month in a valid range and merges days. Keep `usePrayerMonth` for other callers if present.
- Update `src/app/attendance/page.jsx` to keep daily date and report range separately. Default report to the last completed 28th–27th pay period; expose inclusive start/end date inputs and show validation before enabling range queries. Use exclusive next-day end for existing event/override hooks. A maximum 366-day inclusive range limits provider and Firestore reads.
- Flatten daily rows to employee-plus-shift keys. Distinguish pending/in-progress, absent, present/on-time/late, and configuration conflict. Keep unassigned raw calendar-day view. Show shift-specific raw punches and corrections in the drill-down.
- Build report rows from every completed, valid shift in the chosen range. Display working days plus scheduled/present/absent/late shift counts and sum corrected late minutes before applying Option B. Group the detail drill-down by date and shift. Neither future nor overlapping shift windows count as absences.
- Add UI tests where practical; otherwise use pure calculator tests and targeted browser checks at `/attendance` for Arabic/English, 28th boundary, and cross-midnight rows.

## 4. Remove legacy cashier shift functionality

- Remove Users `shifts` tab, its `useShifts` subscription, clock duration formatter, date-fns import, and unused icons/components from `src/app/users/page.jsx`.
- Remove `useActiveShift`, clock handlers, timer store, button, and shift loading dependency from `src/app/pos/page.jsx`. Preserve the order board, order status actions, notification sound, language toggle, and logout.
- Delete `src/hooks/useShifts.js` after confirming no references remain. Remove obsolete `shifts` rule from `firestore.rules` so clients cannot create more clock records; do not delete historical documents. Remove only unused clock-history locale keys and legacy JSDoc. Do not touch `shiftTemplates` or attendance rules.

## 5. Refresh the demo seed safely

- Update `src/lib/attendance/uploadDemoSeed.js`: new tagged employees receive both Fajr and Maghrib template IDs; existing tagged employees retain their original `shiftId` and gain the complementary ID in `shiftIds`. Only tagged demo documents may be updated. Continue to skip real staff mappings.
- Update `src/app/api/attendance/demo-seed/route.js` to validate and generate each assigned shift's punches with deterministic, create-only IDs. Existing raw rows and document IDs must be unchanged. Preserve the 59/60/78-minute original-shift examples; make the second shift on time for those IDs. Keep absence, single-punch, four-punch, overnight, and waiver scenarios. Create new corrections with shift ID; honor any existing ID 9 legacy waiver on its original night shift without duplicating it.
- Extend `src/lib/attendance/demoSeed.test.mjs` for both shifts per working day, rerun determinism, threshold totals, and the current-month cutoff. The upload button remains the only live-data write trigger; no automatic upload during build or tests.

## 6. Documentation and verification

- Update `AGENTS.md` in the same turn as code changes, plus `README.md` and `.github/copilot-instructions.md` for the new Firestore contract and removal of clock-in/out. Keep mobile and website order contracts unchanged.
- Run `rg` for old shift hooks, date-only overrides, and singular assignment consumers; inspect any remaining use. Run focused Node tests, targeted ESLint, editor diagnostics, `git diff --check`, and `npm run build`.
- Confirm no new Vercel environment variable or composite Firestore index is required. Do not change `/iclock`, device serial validation, or live raw ZKTeco events. Do not run a live seed upload automatically.
