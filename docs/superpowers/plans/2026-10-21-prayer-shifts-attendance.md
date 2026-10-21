# Prayer-based attendance implementation plan

1. Add pure Riyadh-date, shift-window, lateness, override, and Option B monthly aggregation helpers. Cover the eight supplied business cases with focused Node tests.
2. Add admin-only Firestore rules and hooks for configurable `shiftTemplates`, `attendanceSettings/default`, and `attendanceOverrides`; extend `employees` with a shift assignment and signed minute offsets.
3. Add an authenticated prayer-times API backed by the existing server Firebase helper. Fetch AlAdhan's Jeddah calendar with method 4 once per uncached month; cache individual `prayerTimes/{YYYY-MM-DD}` documents and preserve manual overrides.
4. Extend the Employees tab for shift assignment and offsets. Add shift-template and policy editing to attendance settings, keeping legacy POS `shifts` untouched.
5. Upgrade `/attendance` with daily shift-aware results, prayer context, override editing, and an on-demand monthly report with daily drill-down.
6. Update bilingual dictionaries, JSDoc, README, AGENTS, and Copilot guidance. Verify syntax, focused tests, diagnostics, and Firestore query/index requirements without changing `/iclock`.

Working days use each employee's configurable weekly days off (empty by default, meaning all days). Only completed shifts after the employee was created count; no salary amount is calculated.
