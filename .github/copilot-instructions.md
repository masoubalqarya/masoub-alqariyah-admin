# Masoub AlQarya Admin Panel — GitHub Copilot Instructions

Companion to [`AGENTS.md`](../AGENTS.md). Prefer AGENTS.md for living project context; keep both files aligned when architecture changes.

## Project overview

Next.js **App Router** admin panel for **Masoub AlQarya** (معصوب القرية). Staff manage menu, offers, restaurants, orders, users, analytics, and cashier POS. Firebase (Auth, Firestore, Storage). Currency **SAR**. Default UI **Arabic RTL**; English LTR toggleable.

**Companion mobile app:** `D:\Dev\React Native\clients\masoub-alqarya`  
**Companion customer website:** `D:\Dev\Web\clients\masoub-alqarya-website`  
See those repos’ `AGENTS.md` and `.github/copilot-instructions.md`. Same Firebase project and order status contract. Website owns marketing + web order create (`src/lib/orders.js`). Mobile and website guest checkout use Anonymous Auth before `createOrder`.

## Tech stack

- Next.js 16 (`src/app`), React 19, **JavaScript / JSX** (JSDoc types in `src/types/index.js`)
- Path alias `@/*` → `./src/*`
- Tailwind CSS 4 + Radix/shadcn UI under `src/components/ui/`
- Brand primary ≈ `#8A776F` (`src/app/globals.css`)
- Firebase client: `src/lib/firebase.js`
- Server Firebase REST: staff Auth+Firestore delete and ZKTeco ingestion use `src/lib/firebaseAdmin.js` (needs `FIREBASE_SERVICE_ACCOUNT_BASE64` on Vercel; never commit keys, never `NEXT_PUBLIC_`)
- Charts: Recharts · Icons: Lucide React

Scripts: `npm run dev` | `build` | `start` | `lint`

## Roles & routes

Staff live in Firestore `users/{uid}` (`role`, `isActive`, optional `restaurantId`).

| Role | Access |
| --- | --- |
| `admin` | Full sidebar; redirected away from `/pos` |
| `cashier` | **Only** `/pos` (restaurant-scoped) |
| `user` | Mobile/website customers — blocked from this panel |

Auth: email/password → load `users/{uid}` → deny if missing, `role === "user"`, or `!isActive`. Guards: `src/hooks/useAuth.jsx`, `src/components/AppShell.jsx`.

| Route | Purpose |
| --- | --- |
| `/` | Dashboard |
| `/orders` | Live orders |
| `/menu` | Menu CRUD (item image optional; allergies catalog + extras `allergyIds`) |
| `/offers` | Offers |
| `/restaurants` | Locations |
| `/users` | Staff + employee roster |
| `/attendance` | Daily prayer/shift attendance, raw punches and corrections, monthly report, shift/policy settings |
| `/analytics` | Charts |
| `/pos` | Cashier board + shifts; order lines show size, cooking, extras |
| `/login` | Auth (no shell) |

## Architecture

- Client-heavy `"use client"` pages; live data via Firestore `onSnapshot`
- Domain hooks in `src/hooks/`: `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useEmployees`, `useAttendance` (events/device/prayer), `useAttendanceConfig`, `useAttendanceOverrides`, `useShifts` (POS) — prefer extending these over inline Firestore in pages
- Layout: `providers.jsx` → Auth → I18n → `AppShell`
- i18n: `src/lib/i18n/` (`en.js` / `ar.js`); logical CSS (`start`/`end`/`ms`/`me`), not raw `left`/`right`
- UI: `src/components/ui/*` + `cn()` from `src/lib/utils.js`
- Money/orders helpers: `formatSAR`, `generateOrderNumber`, `statusColors`, `timeElapsed` in `src/lib/utils.js`
- Update JSDoc in `src/types/index.js` when shapes change

### Order statuses (shared with mobile + website)

`pending` → `preparing` → `onTheWay` → `delivered` | `cancelled`

Status updates must keep the `statusHistory` / `arrayUnion` pattern in `useOrders`. Mobile Track Order, website `/track`, and banners subscribe to the same docs — keep field names and status strings stable. When changing order fields, update **all three** repos.

## Firestore

| Collection | Notes |
| --- | --- |
| `categories`, `menuItems`, `sizeOptions`, `extrasOptions`, `allergiesOptions` | Public read (mobile + website); admin write |
| `offers`, `restaurants` | Public read; admin write |
| `orders` | Staff read/update; creating customer can read own (`userId == auth.uid`); authenticated create (mobile + website); admin delete |
| `users` | Staff profiles. Helpers use `userExists()` so missing `users/{uid}` does not deny the whole rule. |
| `shifts` | Cashier clock-in/out |
| `employees` | Independent employee attendance roster; admin CRUD; optional `zkUserId`, shift assignment, minute offsets, weekly days off |
| `attendanceEvents` | Immutable raw ZKTeco or tagged synthetic demo events; server write, admin read |
| `attendanceDevices` | ZKTeco device heartbeat/metadata; server write, admin read |
| `shiftTemplates` | Admin-only Fajr/Maghrib attendance templates, separate from POS `shifts` |
| `attendanceSettings/default` | Admin-only monthly threshold and prayer configuration |
| `prayerTimes/{YYYY-MM-DD}` | Admin-read/server-written monthly AlAdhan cache and manual adjustments |
| `attendanceOverrides/{employeeId}_{shiftDate}` | Admin-written corrections requiring reason; never alter raw events |

Attendance demo seeding lives in `src/lib/attendance/uploadDemoSeed.js`, `src/lib/attendance/demoSeed.js`, and admin-authenticated `POST /api/attendance/demo-seed`. Users → Employees exposes a confirmation/upload action. It creates only missing tagged employees for IDs 2–10, a tagged Maghrib night shift, create-only synthetic raw events for August/September 2026 plus the current month, and a tagged sample waiver. Keep demo `source: "demo"` distinct from `/iclock` ZKTeco records; do not relax rules or overwrite real employee mappings or raw events. There is no automatic cleanup.
| `customers` | Owner read/create/update (`customers/{uid}`); admin delete. Written by mobile/website on full-account sign-up. |

Rules: root `firestore.rules`, `storage.rules`. Storage: `menuItems/`, `offers/`, `restaurants/`.

## ZKTeco attendance

- Public PUSH endpoint: `src/app/iclock/[...path]/route.js`; do not add Firebase client authentication.
- Required server env: `ZKTECO_ALLOWED_SERIALS` (comma-separated, never `NEXT_PUBLIC_`).
- SenseFace timestamps are local Asia/Riyadh strings and are normalized to UTC timestamps without changing `eventTimeRaw`.
- `attendanceEvents` use deterministic hash IDs and create-only writes; never update a stored raw event.
- `getrequest` updates `attendanceDevices.lastSeenAt` only when the heartbeat is at least five minutes stale.
- The attendance roster is `employees`, not staff login `users` and not legacy POS `shifts`.
- Attendance shift windows, Riyadh time, and Option B monthly deduction minutes are calculated on demand by `src/lib/attendance/calculations.js`; monthly reports count completed working shifts only. Inactive templates still calculate for already-assigned employees but cannot be newly assigned. Weekly off-days are per employee; an empty array means every day is a working day. No monetary deduction is computed.
- `/api/attendance/prayer-times` verifies admin identity with the existing server helper, fetches AlAdhan monthly calendars (default Jeddah/method 4), caches date docs, and preserves manual overrides. Do not expose service credentials or require client auth on `/iclock`.

## Conventions

1. Keep `AGENTS.md` and this file in sync with structural changes
2. Stay JS/JSX unless asked to migrate to TypeScript
3. Match existing hooks + Radix/shadcn patterns
4. Every UI string in **both** `en.js` and `ar.js`; RTL-safe layout
5. Never expose admin-only actions to cashiers; keep cashiers restaurant-scoped
6. Use `@/lib/firebase` shared instances; prefer `onSnapshot` for live lists
7. Upload images via existing Storage helpers in menu/offers/restaurants hooks. Menu item images are optional. Extras have `calories`. Item sizes use `sizePriceAdd` + `sizeCalories`.
8. Do not commit `.env.local` or private keys
9. Scoped diffs only — no drive-by refactors
10. Order status changes must remain real-time-friendly for mobile Track Order and the website `/track` screen

## Key paths

```
src/app/              Routes, layout, providers, globals.css
src/components/       AppShell, Sidebar, ui/*
src/hooks/            Domain Firestore hooks
src/lib/firebase.js
src/lib/firebaseAdmin.js  # server-only Admin SDK
src/lib/i18n/
src/lib/utils.js
src/types/index.js
firestore.rules
storage.rules
AGENTS.md
```
