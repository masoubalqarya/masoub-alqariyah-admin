# Masoub AlQarya Admin Panel — GitHub Copilot Instructions

Companion to [`AGENTS.md`](../AGENTS.md). Prefer AGENTS.md for living project context; keep both files aligned when architecture changes.

## Project overview

Next.js **App Router** admin panel for **Masoub AlQarya** (معصوب القرية). Staff manage menu, offers, restaurants, orders, users, analytics. Firebase (Auth, Firestore, Storage). Currency **SAR**. Default UI **Arabic RTL**; English LTR toggleable.

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

| Role      | Access                                             |
| --------- | -------------------------------------------------- |
| `admin`   | Full sidebar                                       |
| `cashier` | nothing, used by POS app                           |
| `user`    | Mobile/website customers — blocked from this panel |

Auth: email/password → load `users/{uid}` → deny if missing, `role === "user"`, or `!isActive`. Guards: `src/hooks/useAuth.jsx`, `src/components/AppShell.jsx`.

| Route          | Purpose                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`            | Dashboard                                                                                                  |
| `/orders`      | Live orders                                                                                                |
| `/menu`        | Menu CRUD (item image optional; allergies catalog + extras `allergyIds`)                                   |
| `/offers`      | Offers                                                                                                     |
| `/restaurants` | Locations                                                                                                  |
| `/users`       | Staff + employee roster                                                                                    |
| `/attendance`  | Daily two-shift prayer attendance, raw punches and corrections, custom-range report, shift/policy settings |
| `/analytics`   | Charts                                                                                                     |
| `/login`       | Auth (no shell)                                                                                            |

## Architecture

- Client-heavy `"use client"` pages; live data via Firestore `onSnapshot`
- Domain hooks in `src/hooks/`: `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useEmployees`, `useAttendance` (events/device/prayer range), `useAttendanceConfig`, `useAttendanceOverrides` — prefer extending these over inline Firestore in pages
- Layout: `providers.jsx` → Auth → I18n → `AppShell`
- i18n: `src/lib/i18n/` (`en.js` / `ar.js`); logical CSS (`start`/`end`/`ms`/`me`), not raw `left`/`right`
- UI: `src/components/ui/*` + `cn()` from `src/lib/utils.js`
- Money/orders helpers: `formatSAR`, `statusColors`, `timeElapsed` in `src/lib/utils.js`
- Update JSDoc in `src/types/index.js` when shapes change

### Order statuses (shared with mobile + website)

`pending` → `preparing` → `onTheWay` → `delivered` | `cancelled`

Status updates must keep the `statusHistory` / `arrayUnion` pattern in `useOrders`. Mobile Track Order, website `/track`, and banners subscribe to the same docs — keep field names and status strings stable. When changing order fields, update **all three** repos.

## Firestore

| Collection                                                                    | Notes                                                                                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`, `menuItems`, `sizeOptions`, `extrasOptions`, `allergiesOptions` | Public read (mobile + website); admin write                                                                                                   |
| `offers`, `restaurants`                                                       | Public read; admin write                                                                                                                      |
| `orders`                                                                      | Staff read/update; creating customer can read own (`userId == auth.uid`); server create via authenticated `submitCustomerOrder`; admin delete               |
| `users`                                                                       | Staff profiles. Helpers use `userExists()` so missing `users/{uid}` does not deny the whole rule.                                             |
| `shifts`                                                                      | Historical cashier clock records; no client access or new writes                                                                              |
| `employees`                                                                   | Independent employee attendance roster; admin CRUD; optional `zkUserId`, up to two `shiftIds` (Fajr/Maghrib), minute offsets, weekly days off |
| `attendanceEvents`                                                            | Immutable raw ZKTeco or tagged synthetic demo events; server write, admin read                                                                |
| `attendanceDevices`                                                           | ZKTeco device heartbeat/metadata; server write, admin read                                                                                    |
| `shiftTemplates`                                                              | Admin-only Fajr/Maghrib attendance templates                                                                                                  |
| `attendanceSettings/default`                                                  | Admin-only monthly threshold and prayer configuration                                                                                         |
| `prayerTimes/{YYYY-MM-DD}`                                                    | Admin-read/server-written monthly AlAdhan cache and manual adjustments                                                                        |
| `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}`                      | Admin-written per-shift corrections requiring reason; legacy date-only docs remain readable; never alter raw events                           |
| `customers`                                                                   | Owner read/create/update (`customers/{uid}`); admin delete. Written by mobile/website on full-account sign-up.                                |

Attendance demo seeding lives in `src/lib/attendance/uploadDemoSeed.js`, `src/lib/attendance/demoSeed.js`, and admin-authenticated `POST /api/attendance/demo-seed`. Users → Employees exposes a confirmation/upload action. It updates only tagged demo employees for IDs 2–10 to have both Fajr and Maghrib shifts, preserving the original assignment, and appends create-only synthetic events for August/September 2026 plus the current month. Keep demo `source: "demo"` distinct from `/iclock` ZKTeco records; never overwrite real mappings or existing raw events. There is no automatic cleanup.

Rules: root `firestore.rules`, `storage.rules`. Storage: `menuItems/`, `offers/`, `restaurants/`.

Keep [firestore.rules](../firestore.rules) identical to the POS [firebase/firestore.rules](../../masoub-alqarya-pos/firebase/firestore.rules). Active admins and branch-assigned active cashiers retain direct updates to supported `status`, `updatedAt`, and `statusHistory` only. Customer order creation/counters and POS operational writes are server-only; POS reads remain branch-scoped. Both POS configurations use this policy; there is no separate compatibility ruleset.

## ZKTeco attendance

- Public PUSH endpoint: `src/app/iclock/[...path]/route.js`; do not add Firebase client authentication.
- Required server env: `ZKTECO_ALLOWED_SERIALS` (comma-separated, never `NEXT_PUBLIC_`).
- SenseFace timestamps are local Asia/Riyadh strings and are normalized to UTC timestamps without changing `eventTimeRaw`.
- `attendanceEvents` use deterministic hash IDs and create-only writes; never update a stored raw event.
- `getrequest` updates `attendanceDevices.lastSeenAt` only when the heartbeat is at least five minutes stale.
- The attendance roster is `employees`, not staff login `users`. `shiftIds` holds up to two required templates, one Fajr and one Maghrib; old `shiftId` remains readable as a single assignment and for legacy corrections.
- Attendance shift windows, Riyadh time, and Option B deduction minutes are calculated on demand by `src/lib/attendance/calculations.js`; the report defaults to the most recently completed 28th–27th period but accepts an inclusive custom 1–366-day range. It counts only completed working shifts, sums late minutes across both, and flags overlapping punch windows rather than double-counting. Inactive templates still calculate for already-assigned employees. Weekly off-days are per employee; an empty array means every day is a working day. No monetary deduction is computed.
- `/api/attendance/prayer-times` verifies admin identity with the existing server helper, fetches AlAdhan monthly calendars (default Jeddah/method 4), caches date docs, and preserves manual overrides. Do not expose service credentials or require client auth on `/iclock`.
- Prayer API authorization requires an active admin profile and server service-account credentials. Missing/invalid tokens return 401, denied roles return 403, and credential/service failures return 503. Attendance prayer requests wait for Auth initialization and refresh the token once on 401; translated errors distinguish session and server setup problems. Firestore rule changes do not configure server credentials.

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

## Pickup and car-service contract

All four clients use the same Firebase project and `orders.fulfillmentType` (`driveThrough` or `pickup`); missing means existing car service. Pickup skips car entry, writes empty vehicle fields, and identifies collection inside the selected branch by order number. Saved car preferences are preserved. Stored statuses stay unchanged: pickup `onTheWay` displays Ready for pickup and `delivered` displays Collected. Staff actions, customer tracking/history/banners, and POS receipts/kitchen tickets reflect the method. POS print-content checks include it. Keep all four repositories compatible; no new collection or rules deployment is required for this additive field.

## Notes and receipt numbering

Customer orders carry optional trimmed `notes` (max 500 characters). Both customer clients now use authenticated `submitCustomerOrder` in the shared Firebase project / POS Functions codebase. The server creates the order and assigns `orderNumber` from a branch/day counter starting at 1 at Saudi midnight; `orderDate` identifies the day. Clients preserve an idempotent pending request until confirmation (or definitive rejection) and never generate random numbers or write orders directly. Rules deny direct creates/counter access; coordinate callable deployment, updated clients, and rules cutover. Existing receipt numbers and reprints remain unchanged. See [AGENTS.md](../AGENTS.md) for current contracts and rollout requirements.

## Stock, featured items, payment release, and printer routing

The shared catalog uses `menuItems.inStock` (missing means true), `isFeatured` (missing means false), and `featuredRank` (lowest first among featured items). Admin Menu provides a stock toggle plus featured/rank controls in item editing. Stock is global across branches. POS Settings lets active admins and cashiers update global stock through `posAction/setItemStock`. Cashiers must act through their assigned branch; the callable changes availability only, not prices, featured status, or other catalog fields. Mobile and web receive live stock updates, label unavailable products, block adding/checkout, and check offer constituents. The customer callable re-reads stock in its order/counter transaction; unavailable or removed items are rejected before allocating a receipt number. Existing accepted orders are still fulfilled. Both customer menus sort featured items first, including category-filtered views.

The mobile product screen starts with no size selected and blocks adding until the customer chooses a valid attached size. Offer details require a choice for every sized constituent; `addOfferItems` takes a fourth `selectedSizes` map keyed by offer-line index. Each added offer group is distinct so different size choices never merge. Reorder may reuse a previously selected size; legacy lines lacking a size open product selection instead of choosing a default. Cooking defaults remain unchanged. Website size behavior is unchanged.

POS automatic processing requires a server-issued verified `posPayments/{orderId}` proof matching branch, SAR amount, content binding and fingerprint. Card selection alone is not payment verification. Cash orders stay pending until a cashier/admin explicitly transitions them to preparing, then queued printing can run; that action does not claim cash has been collected. Paid receipt success starts preparation, and no physical print is automatically retried after dispatch uncertainty.

POS `Config.routing` saves category-to-printer-ID arrays and reads legacy single strings. All enabled printers, including the first/cashier printer, can be selected per category. A category may target several printers. Receipt printers always receive one full receipt; kitchen printers receive their routed items once. Removing/disabling one destination retains the others; changing a printer template does not remove category membership. Roll out the updated POS client and callable together. No deployment or hardware verification is implied by source changes.
