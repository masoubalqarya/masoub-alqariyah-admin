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

The dual-shift attendance and 28th–27th report design is in [`docs/superpowers/specs/2026-10-21-dual-shift-attendance-period-design.md`](./docs/superpowers/specs/2026-10-21-dual-shift-attendance-period-design.md), with its implementation plan in [`docs/superpowers/plans/2026-10-21-dual-shift-attendance-period.md`](./docs/superpowers/plans/2026-10-21-dual-shift-attendance-period.md).

Restaurant employees live independently in `employees` (not authenticated `users` or legacy POS `shifts`) and optionally map to the SenseFace terminal through `zkUserId`. The admin-only `/attendance` dashboard calculates daily shift-aware attendance and on-demand monthly reports from immutable `attendanceEvents`; there is no materialized daily collection. Its rules are implemented in `src/lib/attendance/calculations.js` and tested in `calculations.test.mjs`. The original first phase is documented in [`docs/superpowers/specs/2026-10-21-attendance-module-design.md`](./docs/superpowers/specs/2026-10-21-attendance-module-design.md).

The public ZKTeco PUSH endpoint remains `src/app/iclock/[...path]/route.js`. It requires the server-only comma-separated `ZKTECO_ALLOWED_SERIALS` environment variable, normalizes device timestamps as Asia/Riyadh UTC+3, uses deterministic event IDs with create-only writes, and rate-limits `getrequest` heartbeat writes to once per five minutes. The known device is SenseFace 2A serial `NYU7253603435`; the UI treats a heartbeat within fifteen minutes as connected.

Configurable prayer-based `shiftTemplates` define Fajr/Maghrib starts, minute offset, fixed end, next-day end, and grace. `employees.shiftIds` holds up to two assignments (one Fajr and one Maghrib); legacy `shiftId` is read only when `shiftIds` is absent and remains a hint for older corrections. Employee-wide signed minute offsets and `weeklyOffDays` (JS weekday 0=Sunday) apply to both. Empty days-off means every calendar day works. Inactive templates remain calculable for already-assigned employees but cannot be newly assigned. The daily table shows an employee's name once in a cell spanning their shift rows; each shift row remains independently selectable for raw punches and corrections, with its own punch and late-minute values. Overlapping buffered windows are flagged rather than double-counted. One punch never becomes a checkout. New `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}` corrections are shift-scoped and require a reason; date-only legacy corrections apply only to the original `shiftId`. Raw events stay unchanged.

The customizable report defaults to the most recently completed 28th–27th period, accepts an inclusive 1–366-day range, fetches all touched prayer months, and counts only completed working shifts after employee creation. It shows distinct working days and scheduled/present/missed/late shift counts. Option B sums corrected late minutes across both shifts before the threshold (`attendanceSettings/default.monthlyLateThresholdMinutes`, default 60); no SAR amount is calculated.

`/api/attendance/prayer-times` is an admin-authenticated server route using the existing `firebaseAdmin.js` REST helper. It fetches one AlAdhan monthly Jeddah calendar using method 4 and caches `prayerTimes/{YYYY-MM-DD}`; manual overrides with reason are never overwritten by a provider refresh. Firestore rules allow admin-only configuration and override reads/writes, server-only prayer-time writes, and still disallow client raw-event writes. `/iclock` is unchanged. historical `shifts` documents are not deleted, but the client rule for them is removed.

Prayer API access requires `users/{uid}` with `role: "admin"` and `isActive === true`, plus server Firebase service-account credentials for profile reads and cache writes. The route returns 401 only for missing/invalid Firebase ID tokens, 403 for denied staff access, and 503 for server credential or authorization-service failures. [src/hooks/useAttendance.js](./src/hooks/useAttendance.js) waits for Auth initialization and retries prayer requests once with a refreshed token after 401. The attendance table shows translated error categories; never loosen Firestore rules to work around this API's server setup. Configure credentials as documented in [README.md](./README.md) and restart the development server or redeploy after environment changes.

Users → Employees has an admin-only demo attendance upload action. `src/lib/attendance/uploadDemoSeed.js` creates or updates only tagged demo employees for ZK IDs 2–10 to assign both a morning and demo night shift, skipping IDs mapped to real staff. Existing tagged employees retain their original shift and gain the complementary assignment. It loads August/September 2026 and current-month prayer caches, then calls the admin-authenticated `POST /api/attendance/demo-seed` per employee/month. The route uses the existing `firebaseAdmin.js` REST helper for deterministic create-only synthetic `attendanceEvents` (`source: "demo"`, `demoSeedId: "attendance-demo-v1"`) for both shifts and a shift-scoped tagged waiver, while honoring an existing legacy waiver. `src/lib/attendance/demoSeed.js` contains the deterministic cases; `demoSeed.test.mjs` verifies threshold, missing/single/multiple, overnight, and dual-shift cases. The demo roster is backdated to 2026-08-01 for historical reports. There is no cleanup action, additional environment variable, or new index. Never mistake tagged demo events for terminal traffic or alter the public `/iclock` endpoint for seeding.

## Companion mobile app

|                     |                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Repo path**       | `D:\Dev\React Native\clients\masoub-alqarya`                                                                                            |
| **Agent docs**      | `AGENTS.md` in that repo (open via multi-root workspace)                                                                                |
| **Copilot docs**    | `.github/copilot-instructions.md` in that repo                                                                                          |
| **Owns**            | Customer ordering UI, cart, car plate, payment flow, Track Order, customer Auth → `customers/{uid}` (guest checkout via anonymous auth) |
| **Shared contract** | Same Firebase project; order statuses and `createOrder` payload must stay compatible with mobile `src/firebase/orders.js`               |

## Companion customer website

|                     |                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repo path**       | `D:\Dev\Web\clients\masoub-alqarya-website`                                                                                                                                       |
| **Agent docs**      | `AGENTS.md` in that repo (open via multi-root workspace)                                                                                                                          |
| **Copilot docs**    | `.github/copilot-instructions.md` in that repo                                                                                                                                    |
| **Owns**            | Marketing site + web drive-through ordering (guest checkout via anonymous auth; full account for `/orders`); public `/privacy`, `/terms`, `/delete-account`, and `/support` pages |
| **Shared contract** | Same Firebase project; website `src/lib/orders.js` `createOrder` must stay compatible with mobile `src/firebase/orders.js` and admin `src/types/index.js`                         |

When changing order fields, statuses, menu shapes, or security rules: update **all three** repos’ docs and keep admin `src/types/index.js` aligned with mobile and website order writes.

The customer website’s public privacy, terms, account-deletion, and support pages direct customer requests to `info@masoubalqariyah.com`. `/terms` covers both website and mobile-app use. Account deletion is currently an email-request flow; it does not call an admin-panel endpoint or change Firestore rules.

## Pickup and car-service orders (all four clients)

The mobile app and website now write `fulfillmentType: "driveThrough" | "pickup"` on the existing shared `orders`. Missing means legacy car service. Pickup is collected inside the chosen branch using the order number, with empty vehicle fields. [src/lib/fulfillment.js](./src/lib/fulfillment.js) centralizes the method check and status-label mapping. Dashboard/orders show the method; pickup details omit vehicle rows.

Keep the stored status pipeline unchanged: pickup `onTheWay` means **Ready for pickup** and pickup `delivered` means **Collected**. Orders offers corresponding ready/collected actions; status filters group both methods under their existing stored values. The [POS](../masoub-alqarya-pos/AGENTS.md) uses the same field in its board, receipts/kitchen tickets, and print-content checks. Coordinate schema/status changes across all four repositories. The additive field needs no new Firebase project, collection, or rules deployment.

## Tech stack

| Layer       | Choice                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Next.js 16 (`src/app`), React 19                                                                                                                                                                                                          |
| Language    | **JavaScript / JSX** — no TypeScript sources; types live as JSDoc in `src/types/index.js`                                                                                                                                                 |
| Paths       | `@/*` → `./src/*` (`jsconfig.json`)                                                                                                                                                                                                       |
| Styling     | Tailwind CSS 4 + shadcn-style Radix UI under `src/components/ui/`                                                                                                                                                                         |
| Brand color | Warm earthy primary ≈ `#8A776F` (HSL in `src/app/globals.css`)                                                                                                                                                                            |
| Data        | Firebase client SDK (`src/lib/firebase.js` — web config currently hardcoded). Staff Auth delete and ZKTeco ingestion use Identity Toolkit / Firestore REST via `src/lib/firebaseAdmin.js` (no `firebase-admin` SDK — it breaks on Vercel) |
| Charts      | Recharts                                                                                                                                                                                                                                  |
| Icons       | Lucide React                                                                                                                                                                                                                              |

Scripts: `npm run dev` | `build` | `start` | `lint`

## Minimal validation — no builds

- Use the smallest check that verifies the change. For documentation-only or cosmetic changes, review the diff; do not run lint, typecheck, or tests.
- For code changes, start with existing editor diagnostics for changed files. Run a targeted lint check or relevant existing test only when needed. Run typecheck only when the change needs type validation; it is not mandatory for every task.
- Do not automatically run full-repository lint, full test suites, integration/emulator suites, Expo Doctor, dependency installation, or repeated checks. Broaden checks only for a concrete unresolved issue or an explicit user request.
- **Do not run builds for validation:** no app/web/production/native/backend builds, EAS builds, `expo prebuild`, or bundle exports. Run a build only when the user explicitly requests building or shipping as the task itself.
- Stop after the minimal relevant check passes. Report what was checked and any material limitation; do not fix unrelated baseline failures.

**Client mirror:** pushes to `main` on `Hadionly/masoub-alqarya-admin-panel` sync to `masoubalqarya/masoub-alqariyah-admin` via `.github/workflows/sync-client.yml` (`CLIENT_GITHUB_TOKEN` secret).

## Roles & routing

Staff profiles live in Firestore `users/{uid}` (`role`, `isActive`, optional `restaurantId`).

| Role      | Access                                                                                       |
| --------- | -------------------------------------------------------------------------------------------- |
| `admin`   | Full sidebar UI: dashboard, orders, menu, offers, restaurants, users, attendance, analytics. |
| `cashier` | **Only** used to login on the POS app. Scoped to their `restaurantId`.                       |
| `user`    | Blocked from the admin panel (mobile/website customers).                                     |

Auth flow: email/password → load `users/{uid}` → deny if missing, `role === "user"`, or `!isActive`. Guarded in `src/hooks/useAuth.jsx` and `src/components/AppShell.jsx`.

### Pages

| Route          | Purpose                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Dashboard KPIs / recent orders                                                                                                                                                                             |
| `/orders`      | Live orders management                                                                                                                                                                                     |
| `/menu`        | Menu items, categories, sizes, extras, **allergies catalog** CRUD (item **image upload is optional**; items carry `calories`, `availableSizes`, `sizeCalories`, `ingredients`, `allergies` as catalog ids) |
| `/offers`      | Promotional offers + images                                                                                                                                                                                |
| `/restaurants` | Locations, open/closed                                                                                                                                                                                     |
| `/users`       | Admin/cashier account management plus independent employee attendance roster CRUD                                                                                                                          |
| `/attendance`  | Daily prayer/shift-aware attendance, raw punches and corrections, monthly report, shift/policy settings, SenseFace status                                                                                  |
| `/analytics`   | Charts (orders, revenue, payments)                                                                                                                                                                         |
| `/login`       | Auth (no shell)                                                                                                                                                                                            |

## Architecture patterns

- **Client-heavy:** pages and hooks are `"use client"`. Real-time data via Firestore `onSnapshot`.
- **Data layer:** domain hooks in `src/hooks/` — prefer extending these over putting Firestore calls in page components.
  - `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useEmployees`, `useAttendance` (events/device/prayer), `useAttendanceConfig`, `useAttendanceOverrides`
- **Staff delete:** `deleteUser` in `useUsers` calls `DELETE /api/users/[uid]`, which removes the Firebase Auth account and the Firestore `users/{uid}` doc via Google REST APIs (not the `firebase-admin` package). Requires `FIREBASE_SERVICE_ACCOUNT_BASE64` on Vercel (preferred), or `FIREBASE_SERVICE_ACCOUNT` JSON / `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` locally. Do not commit those secrets or prefix them with `NEXT_PUBLIC_`.
- **Layout:** `providers.jsx` wraps Auth → I18n → `AppShell` (sidebar + role redirects).
- **i18n:** `src/lib/i18n/` — dictionaries `en.js` / `ar.js`. Use logical CSS (`start`/`end`/`ms`/`me`/`border-e`), not raw `left`/`right`. Add **both** EN and AR strings for any new UI copy.
- **UI:** reuse `src/components/ui/*`. Compose with `cn()` from `src/lib/utils.js`.
- **Money / orders:** `formatSAR`, `statusColors`, `timeElapsed` in `src/lib/utils.js`.
- **Types:** update JSDoc in `src/types/index.js` when changing data shapes.
- **MenuItem extended fields:** `calories` (required number, base kcal), `availableSizes` (ids from `sizeOptions`), `sizeCalories` (`{[sizeId]: number}`), `sizePriceAdd` (`{[sizeId]: number}` — extra SAR for that size; overrides global `sizeOptions.priceAdd`). `ingredients` (`[{ nameEn, nameAr }]`), `allergies` (ids from `allergiesOptions` — **base** allergens). `availableExtras` (ids from `extrasOptions`). Extras carry `calories` and `allergyIds`; mobile shows extra kcal on the extra row and extra allergies only after the extra is selected. Catalog seed: mobile `src/firebase/uploadData.js`.

### Order statuses

`pending` → `preparing` → `onTheWay` → `delivered` | `cancelled`

Status updates should keep the audit trail pattern in `useOrders` (`statusHistory` via `arrayUnion`).

## Firestore collections

| Collection                                                                    | Notes                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`, `menuItems`, `sizeOptions`, `extrasOptions`, `allergiesOptions` | Public read (mobile + website); admin write                                                                                                                                        |
| `offers`, `restaurants`                                                       | Public read; admin write                                                                                                                                                           |
| `orders`                                                                      | Staff read/update (cashier only own restaurant); creating customer can read own (`userId == auth.uid`); server create via authenticated `submitCustomerOrder` (including anonymous); admin delete |
| `users`                                                                       | Admin manage; users may read own doc. Staff helpers use `userExists()` so missing `users/{uid}` (customers) does not deny the whole rule.                                          |
| `shifts`                                                                      | Historical cashier clock records only; no client access or new writes                                                                                                              |
| `employees`                                                                   | Independent attendance roster; admin read/write; optional `zkUserId`, up to two `shiftIds`, minute offsets, weekly days off                                                        |
| `attendanceEvents`                                                            | Immutable raw SenseFace punches; server write, admin read                                                                                                                          |
| `attendanceDevices`                                                           | SenseFace metadata and rate-limited `lastSeenAt`; server write, admin read                                                                                                         |
| `shiftTemplates`                                                              | Admin-managed prayer-start attendance shifts                                                                                                                                       |
| `attendanceSettings/default`                                                  | Admin-managed monthly lateness threshold and prayer provider config                                                                                                                |
| `prayerTimes/{YYYY-MM-DD}`                                                    | Admin-read, server-written AlAdhan cache and manual overrides                                                                                                                      |
| `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}`                      | Admin-written, reasoned per-shift corrections; legacy date-only docs remain readable; raw events never edited                                                                      |
| `customers`                                                                   | Written by mobile/website on full-account sign-up (`customers/{uid}`); owner read/create/update; admin delete; not managed in this panel UI                                        |

Security rules: root `firestore.rules` and `storage.rules`. Storage paths: `menuItems/`, `offers/`, `restaurants/`.

[firestore.rules](./firestore.rules) is identical to the POS [firebase/firestore.rules](../masoub-alqarya-pos/firebase/firestore.rules); keep both synchronized. Both POS Firebase configurations use that shared policy; the separate compatibility file was removed. Active admins and active cashiers assigned to the order's branch may update only `status`, `updatedAt`, and `statusHistory`, with a supported status value. Admin deletion remains allowed. Customer creation/counters and POS operational writes remain server-only; POS reads are scoped to active staff and branch. Deploying either rules source replaces the rules for the same shared Firebase project.

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

## Customer notes and daily receipt numbers

Orders now include optional trimmed `notes` (max 500 characters), shown on cards and in the details dialog. Arabic pickup labels are complete UTF-8 text. The mobile app and website submit through authenticated `submitCustomerOrder` in the shared Firebase project (`europe-west1`, Functions codebase `pos`, source in the POS repo). The server creates `pending` orders and allocates `orderNumber` atomically from `orderCounters/{restaurantId}__{YYYY-MM-DD}`. Numbers start at 1 for each branch each Saudi calendar day (Asia/Riyadh); `orderDate` records that day. Mobile and web use one branch/day sequence. Old orders, retries, and reprints retain their assigned numbers.

[firestore.rules](./firestore.rules) denies direct order creation and all client counter access. Customer Auth/own-order reads and existing admin/cashier status updates remain supported. Deploy the callable before updated customer clients and coordinate the rules cutover; older direct-write clients require updating. Never reset counters or generate receipt numbers from the admin client.

## Stock, featured items, payment release, and printer routing

The shared catalog uses `menuItems.inStock` (missing means true), `isFeatured` (missing means false), and `featuredRank` (lowest first among featured items). Admin Menu provides a stock toggle plus featured/rank controls in item editing. Stock is global across branches. POS Settings lets active admins and cashiers update global stock through `posAction/setItemStock`. Cashiers must act through their assigned branch; the callable changes availability only, not prices, featured status, or other catalog fields. Mobile and web receive live stock updates, label unavailable products, block adding/checkout, and check offer constituents. The customer callable re-reads stock in its order/counter transaction; unavailable or removed items are rejected before allocating a receipt number. Existing accepted orders are still fulfilled. Both customer menus sort featured items first, including category-filtered views.

The mobile product screen starts with no size selected and blocks adding until the customer chooses a valid attached size. Offer details require a choice for every sized constituent; `addOfferItems` takes a fourth `selectedSizes` map keyed by offer-line index. Each added offer group is distinct so different size choices never merge. Reorder may reuse a previously selected size; legacy lines lacking a size open product selection instead of choosing a default. Cooking defaults remain unchanged. Website size behavior is unchanged.

POS automatic processing requires a server-issued verified `posPayments/{orderId}` proof matching branch, SAR amount, content binding and fingerprint. Card selection alone is not payment verification. Cash orders stay pending until a cashier/admin explicitly transitions them to preparing, then queued printing can run; that action does not claim cash has been collected. Paid receipt success starts preparation, and no physical print is automatically retried after dispatch uncertainty.

POS `Config.routing` saves category-to-printer-ID arrays and reads legacy single strings. All enabled printers, including the first/cashier printer, can be selected per category. A category may target several printers. Receipt printers always receive one full receipt; kitchen printers receive their routed items once. Removing/disabling one destination retains the others; changing a printer template does not remove category membership. Roll out the updated POS client and callable together. No deployment or hardware verification is implied by source changes.
