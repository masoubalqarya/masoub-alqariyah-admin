# AGENTS.md — Masoub AlQarya Admin Panel

Living project context for AI agents. Keep this file accurate; prefer it over stale assumptions.

## Mandatory maintenance

**After every change you make in this repository, update `AGENTS.md` in the same turn** so it stays consistent with the codebase.

Update whenever your work affects any of the following (non-exhaustive):

- Routes / pages / navigation
- Roles, auth, or access control
- Firestore / Storage collections, fields, or security rules
- Hooks, data patterns, or shared utilities
- i18n structure or RTL/LTR conventions
- Tech stack, scripts, or project layout
- Domain models (`src/types/index.js`)
- Integrations with the mobile app or customer website

Also update [`README.md`](./README.md) when the change is user-facing or structural (new pages, setup steps, collections, roles, deploy notes). Also update [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) when architecture or conventions change. Do not leave README, AGENTS.md, and Copilot instructions conflicting.

If a change is purely cosmetic with no behavioral or structural impact, a docs update is optional — when unsure, update.

## What this is

Next.js **App Router** admin panel for the **Masoub AlQarya** (معصوب القرية) food-ordering business in Saudi Arabia. Backend is **Firebase** (Auth, Firestore, Storage). A separate mobile app and customer website share the same Firestore data.

Currency is always **SAR (ر.س)**. Default UI locale is **Arabic RTL**; English LTR is toggleable.

## Employee attendance

The approved follow-up design for dual required Fajr/Maghrib shifts, a customizable 28th–27th report period, removal of legacy POS clock-in/out, and updated demo data is in [`docs/superpowers/specs/2026-10-21-dual-shift-attendance-period-design.md`](./docs/superpowers/specs/2026-10-21-dual-shift-attendance-period-design.md). It is a pending design, not yet the implemented behavior described below.

Restaurant employees live independently in `employees` (not authenticated `users` or legacy POS `shifts`) and optionally map to the SenseFace terminal through `zkUserId`. The admin-only `/attendance` dashboard calculates daily shift-aware attendance and on-demand monthly reports from immutable `attendanceEvents`; there is no materialized daily collection. Its rules are implemented in `src/lib/attendance/calculations.js` and tested in `calculations.test.mjs`. The original first phase is documented in [`docs/superpowers/specs/2026-10-21-attendance-module-design.md`](./docs/superpowers/specs/2026-10-21-attendance-module-design.md).

The public ZKTeco PUSH endpoint remains `src/app/iclock/[...path]/route.js`. It requires the server-only comma-separated `ZKTECO_ALLOWED_SERIALS` environment variable, normalizes device timestamps as Asia/Riyadh UTC+3, uses deterministic event IDs with create-only writes, and rate-limits `getrequest` heartbeat writes to once per five minutes. The known device is SenseFace 2A serial `NYU7253603435`; the UI treats a heartbeat within fifteen minutes as connected.

Configurable prayer-based `shiftTemplates` define Fajr/Maghrib starts, minute offset, fixed end, next-day end, and grace; `employees` add `shiftId`, signed start/end minute offsets, and `weeklyOffDays` (JS weekday 0=Sunday). Empty days-off means every calendar day is a working day. Monthly reports count only completed working shifts after employee creation; employees without an assigned shift are not counted. Inactive templates remain calculable for already-assigned employees but cannot be newly assigned. A 90-minute buffer around each calculated shift assigns raw punches, including post-midnight punches, to `shiftDate`. A single punch never becomes a checkout. Admin corrections in `attendanceOverrides` apply after raw calculations and require a reason; raw events stay unchanged. Monthly Option B: once total corrected late minutes reach `attendanceSettings/default.monthlyLateThresholdMinutes` (default 60), all late minutes are deductible; no SAR amount is calculated.

`/api/attendance/prayer-times` is an admin-authenticated server route using the existing `firebaseAdmin.js` REST helper. It fetches one AlAdhan monthly Jeddah calendar using method 4 and caches `prayerTimes/{YYYY-MM-DD}`; manual overrides with reason are never overwritten by a provider refresh. Firestore rules allow admin-only configuration and override reads/writes, server-only prayer-time writes, and still disallow client raw-event writes. The implementation plan is [`docs/superpowers/plans/2026-10-21-prayer-shifts-attendance.md`](./docs/superpowers/plans/2026-10-21-prayer-shifts-attendance.md). `/iclock` and POS `shifts` remain unchanged.

Users → Employees now has an admin-only demo attendance upload action. `src/lib/attendance/uploadDemoSeed.js` creates only missing, tagged demo employee documents for ZK IDs 2–10 and `shiftTemplates/attendance-demo-night-v1` via client admin rules, skipping IDs already mapped to real staff. It loads August/September 2026 and current-month prayer caches, then calls the admin-authenticated `POST /api/attendance/demo-seed` per employee/month. The route uses the existing `firebaseAdmin.js` REST helper for deterministic create-only synthetic `attendanceEvents` (`source: "demo"`, `demoSeedId: "attendance-demo-v1"`) and an optional tagged waiver. `src/lib/attendance/demoSeed.js` contains the deterministic cases; `demoSeed.test.mjs` verifies threshold, missing/single/multiple, and overnight cases. The demo roster is backdated to 2026-08-01 for historical reports. There is no cleanup action, Firestore rules change, additional environment variable, or new index. Never mistake tagged demo events for terminal traffic or alter the public `/iclock` endpoint for seeding.

## Companion mobile app

| | |
| --- | --- |
| **Repo path** | `D:\Dev\React Native\clients\masoub-alqarya` |
| **Agent docs** | `AGENTS.md` in that repo (open via multi-root workspace) |
| **Copilot docs** | `.github/copilot-instructions.md` in that repo |
| **Owns** | Customer ordering UI, cart, car plate, payment flow, Track Order, customer Auth → `customers/{uid}` (guest checkout via anonymous auth) |
| **Shared contract** | Same Firebase project; order statuses and `createOrder` payload must stay compatible with mobile `src/firebase/orders.js` |

## Companion customer website

| | |
| --- | --- |
| **Repo path** | `D:\Dev\Web\clients\masoub-alqarya-website` |
| **Agent docs** | `AGENTS.md` in that repo (open via multi-root workspace) |
| **Copilot docs** | `.github/copilot-instructions.md` in that repo |
| **Owns** | Marketing site + web drive-through ordering (guest checkout via anonymous auth; full account for `/orders`); public `/privacy`, `/terms`, `/delete-account`, and `/support` pages |
| **Shared contract** | Same Firebase project; website `src/lib/orders.js` `createOrder` must stay compatible with mobile `src/firebase/orders.js` and admin `src/types/index.js` |

When changing order fields, statuses, menu shapes, or security rules: update **all three** repos’ docs and keep admin `src/types/index.js` aligned with mobile and website order writes.

The customer website’s public privacy, terms, account-deletion, and support pages direct customer requests to `info@masoubalqariyah.com`. `/terms` covers both website and mobile-app use. Account deletion is currently an email-request flow; it does not call an admin-panel endpoint or change Firestore rules.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (`src/app`), React 19 |
| Language | **JavaScript / JSX** — no TypeScript sources; types live as JSDoc in `src/types/index.js` |
| Paths | `@/*` → `./src/*` (`jsconfig.json`) |
| Styling | Tailwind CSS 4 + shadcn-style Radix UI under `src/components/ui/` |
| Brand color | Warm earthy primary ≈ `#8A776F` (HSL in `src/app/globals.css`) |
| Data | Firebase client SDK (`src/lib/firebase.js` — web config currently hardcoded). Staff Auth delete and ZKTeco ingestion use Identity Toolkit / Firestore REST via `src/lib/firebaseAdmin.js` (no `firebase-admin` SDK — it breaks on Vercel) |
| Charts | Recharts |
| Icons | Lucide React |

Scripts: `npm run dev` | `build` | `start` | `lint`

**Client mirror:** pushes to `main` on `Hadionly/masoub-alqarya-admin-panel` sync to `masoubalqarya/masoub-alqariyah-admin` via `.github/workflows/sync-client.yml` (`CLIENT_GITHUB_TOKEN` secret).

## Roles & routing

Staff profiles live in Firestore `users/{uid}` (`role`, `isActive`, optional `restaurantId`).

| Role | Access |
| --- | --- |
| `admin` | Full sidebar UI: dashboard, orders, menu, offers, restaurants, users, attendance, analytics. Redirected away from `/pos`. |
| `cashier` | **Only** `/pos` (kanban order board + shift clock-in/out). No sidebar. Scoped to their `restaurantId`. |
| `user` | Blocked from the admin panel (mobile/website customers). |

Auth flow: email/password → load `users/{uid}` → deny if missing, `role === "user"`, or `!isActive`. Guarded in `src/hooks/useAuth.jsx` and `src/components/AppShell.jsx`.

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard KPIs / recent orders |
| `/orders` | Live orders management |
| `/menu` | Menu items, categories, sizes, extras, **allergies catalog** CRUD (item **image upload is optional**; items carry `calories`, `availableSizes`, `sizeCalories`, `ingredients`, `allergies` as catalog ids) |
| `/offers` | Promotional offers + images |
| `/restaurants` | Locations, open/closed |
| `/users` | Admin/cashier account management plus independent employee attendance roster CRUD |
| `/attendance` | Daily prayer/shift-aware attendance, raw punches and corrections, monthly report, shift/policy settings, SenseFace status |
| `/analytics` | Charts (orders, revenue, payments) |
| `/pos` | Cashier POS / kitchen board (size, cooking, extras on each line) |
| `/login` | Auth (no shell) |

## Architecture patterns

- **Client-heavy:** pages and hooks are `"use client"`. Real-time data via Firestore `onSnapshot`.
- **Data layer:** domain hooks in `src/hooks/` — prefer extending these over putting Firestore calls in page components.
  - `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useEmployees`, `useAttendance` (events/device/prayer), `useAttendanceConfig`, `useAttendanceOverrides`, `useShifts` (POS)
- **Staff delete:** `deleteUser` in `useUsers` calls `DELETE /api/users/[uid]`, which removes the Firebase Auth account and the Firestore `users/{uid}` doc via Google REST APIs (not the `firebase-admin` package). Requires `FIREBASE_SERVICE_ACCOUNT_BASE64` on Vercel (preferred), or `FIREBASE_SERVICE_ACCOUNT` JSON / `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` locally. Do not commit those secrets or prefix them with `NEXT_PUBLIC_`.
- **Layout:** `providers.jsx` wraps Auth → I18n → `AppShell` (sidebar + role redirects).
- **i18n:** `src/lib/i18n/` — dictionaries `en.js` / `ar.js`. Use logical CSS (`start`/`end`/`ms`/`me`/`border-e`), not raw `left`/`right`. Add **both** EN and AR strings for any new UI copy.
- **UI:** reuse `src/components/ui/*`. Compose with `cn()` from `src/lib/utils.js`.
- **Money / orders:** `formatSAR`, `generateOrderNumber`, `statusColors`, `timeElapsed` in `src/lib/utils.js`.
- **Types:** update JSDoc in `src/types/index.js` when changing data shapes.
- **MenuItem extended fields:** `calories` (required number, base kcal), `availableSizes` (ids from `sizeOptions`), `sizeCalories` (`{[sizeId]: number}`), `sizePriceAdd` (`{[sizeId]: number}` — extra SAR for that size; overrides global `sizeOptions.priceAdd`). `ingredients` (`[{ nameEn, nameAr }]`), `allergies` (ids from `allergiesOptions` — **base** allergens). `availableExtras` (ids from `extrasOptions`). Extras carry `calories` and `allergyIds`; mobile shows extra kcal on the extra row and extra allergies only after the extra is selected. Catalog seed: mobile `src/firebase/uploadData.js`.

### Order statuses

`pending` → `preparing` → `onTheWay` → `delivered` | `cancelled`

Status updates should keep the audit trail pattern in `useOrders` (`statusHistory` via `arrayUnion`).

## Firestore collections

| Collection | Notes |
| --- | --- |
| `categories`, `menuItems`, `sizeOptions`, `extrasOptions`, `allergiesOptions` | Public read (mobile + website); admin write |
| `offers`, `restaurants` | Public read; admin write |
| `orders` | Staff read/update (cashier only own restaurant); creating customer can read own (`userId == auth.uid`); authenticated create (mobile + website, including anonymous); admin delete |
| `users` | Admin manage; users may read own doc. Staff helpers use `userExists()` so missing `users/{uid}` (customers) does not deny the whole rule. |
| `shifts` | Cashier clock-in/out; staff read |
| `employees` | Independent attendance roster; admin read/write; optional `zkUserId`, `shiftId`, minute offsets, weekly days off |
| `attendanceEvents` | Immutable raw SenseFace punches; server write, admin read |
| `attendanceDevices` | SenseFace metadata and rate-limited `lastSeenAt`; server write, admin read |
| `shiftTemplates` | Admin-managed prayer-start attendance shifts (not POS `shifts`) |
| `attendanceSettings/default` | Admin-managed monthly lateness threshold and prayer provider config |
| `prayerTimes/{YYYY-MM-DD}` | Admin-read, server-written AlAdhan cache and manual overrides |
| `attendanceOverrides/{employeeId}_{shiftDate}` | Admin-written, reasoned corrections; raw events never edited |
| `customers` | Written by mobile/website on full-account sign-up (`customers/{uid}`); owner read/create/update; admin delete; not managed in this panel UI |

Security rules: root `firestore.rules` and `storage.rules`. Storage paths: `menuItems/`, `offers/`, `restaurants/`.

## Conventions for agents

1. **Keep `AGENTS.md`, Copilot instructions, and README when relevant in sync** — see Mandatory maintenance above.
2. **Stay in JS/JSX** — do not convert the project to TypeScript unless explicitly asked.
3. **Match existing style** — functional components, hooks for data, Radix/shadcn UI primitives, Lucide icons.
4. **Bilingual + RTL** — every user-facing string in `en.js` and `ar.js`; keep layout RTL-safe.
5. **Respect roles** — never expose admin-only pages or actions to cashiers; cashiers stay restaurant-scoped.
6. **Firebase** — use shared `auth` / `db` / `storage` from `@/lib/firebase`. Prefer `onSnapshot` for live lists.
7. **Images** — upload via Firebase Storage helpers already used in menu/offers/restaurants hooks. Menu item images are **optional** (empty `image` string is allowed).
8. **Secrets** — do not commit `.env.local`. Do not paste service-account or private keys into the repo.
9. **Scope** — change only what the task needs; avoid drive-by refactors and unsolicited markdown docs beyond AGENTS/README sync.
10. **Order contract** — order status changes in Firestore must remain real-time-friendly for mobile Track Order and the website `/track` screen. Keep `createOrder` payloads compatible across admin, mobile, and website.

## Key files

```
src/app/                 # Routes + layout + providers + globals.css
src/components/          # AppShell, Sidebar, ui/*
src/hooks/               # Auth + Firestore domain hooks
src/lib/firebase.js      # Firebase client init
src/lib/firebaseAdmin.js # Admin SDK (server-only; staff Auth delete)
src/lib/i18n/            # Locale provider + dictionaries
src/lib/utils.js         # cn, SAR, order helpers
src/types/index.js       # JSDoc domain models
firestore.rules          # AuthZ source of truth
storage.rules
AGENTS.md                # This file — update after each agent change
.github/copilot-instructions.md
README.md                # Human-facing docs — keep aligned with AGENTS.md
```
