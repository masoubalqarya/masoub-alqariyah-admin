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

Configurable `shiftTemplates` define manual or Fajr/Maghrib prayer-based starts, minute offset, fixed end, next-day end, and grace. `employees.shiftIds` holds up to two assignments (one Fajr and one Maghrib); legacy `shiftId` is read only when `shiftIds` is absent and remains a hint for older corrections. Employee-wide signed minute offsets and `weeklyOffDays` (JS weekday 0=Sunday) apply to both. Empty days-off means every calendar day works. Inactive templates remain calculable for already-assigned employees but cannot be newly assigned. The daily table shows an employee's name once in a cell spanning their shift rows; each shift row remains independently selectable for raw punches and corrections, with its own punch and late-minute values. Overlapping buffered windows are flagged rather than double-counted. One punch never becomes a checkout. New `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}` corrections are shift-scoped and require a reason; date-only legacy corrections apply only to the original `shiftId`. Raw events stay unchanged.

The customizable report defaults to the range from one calendar month earlier through today, accepts an inclusive 1–366-day range, fetches all touched prayer months, and counts only completed working shifts after employee creation. It shows distinct working days and scheduled/present/missed/late shift counts. Option B sums corrected late minutes across both shifts before the threshold (`attendanceSettings/default.monthlyLateThresholdMinutes`, default 60); no SAR amount is calculated.

`/api/attendance/prayer-times` is an admin-authenticated server route using the existing `firebaseAdmin.js` REST helper. It fetches one AlAdhan monthly Jeddah calendar using method 4 and caches `prayerTimes/{YYYY-MM-DD}`; manual overrides with reason are never overwritten by a provider refresh. Firestore rules allow admin-only configuration and override reads/writes, server-only prayer-time writes, and still disallow client raw-event writes. `/iclock` is unchanged. historical `shifts` documents are not deleted, but the client rule for them is removed.

Prayer API access requires `users/{uid}` with `role: "admin"` and `isActive === true`, plus server Firebase service-account credentials for profile reads and cache writes. The route returns 401 only for missing/invalid Firebase ID tokens, 403 for denied staff access, and 503 for server credential or authorization-service failures. [src/hooks/useAttendance.js](./src/hooks/useAttendance.js) waits for Auth initialization and retries prayer requests once with a refreshed token after 401. The attendance table shows translated error categories; never loosen Firestore rules to work around this API's server setup. Configure credentials as documented in [README.md](./README.md) and restart the development server or redeploy after environment changes.

Users → Employees has an admin-only demo attendance upload action. `src/lib/attendance/uploadDemoSeed.js` creates or updates only tagged demo employees for ZK IDs 2–10 to assign both a morning and demo night shift, skipping IDs mapped to real staff. Existing tagged employees retain their original shift and gain the complementary assignment. It loads August/September 2026 and current-month prayer caches, then calls the admin-authenticated `POST /api/attendance/demo-seed` per employee/month. The route uses the existing `firebaseAdmin.js` REST helper for deterministic create-only synthetic `attendanceEvents` (`source: "demo"`, `demoSeedId: "attendance-demo-v1"`) for both shifts and a shift-scoped tagged waiver, while honoring an existing legacy waiver. `src/lib/attendance/demoSeed.js` contains the deterministic cases; `demoSeed.test.mjs` verifies threshold, missing/single/multiple, overnight, and dual-shift cases. The demo roster is backdated to 2026-08-01 for historical reports. There is no cleanup action, additional environment variable, or new index. Never mistake tagged demo events for terminal traffic or alter the public `/iclock` endpoint for seeding.

## Companion mobile app

|                     |                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Repo path**       | `D:\Dev\React Native\clients\masoub-alqarya`                                                                                            |
| **Agent docs**      | `AGENTS.md` in that repo (open via multi-root workspace)                                                                                |
| **Copilot docs**    | `.github/copilot-instructions.md` in that repo                                                                                          |
| **Owns**            | Customer ordering UI, cart, car plate, cash payment flow, Track Order, customer Auth → `customers/{uid}` (guest checkout via anonymous auth) |
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
| `/app-settings` | Mobile homepage hero and iOS/Android optional or forced update policies |
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

Security rules: root `firestore.rules` and `storage.rules`. Storage paths: `menuItems/`, `offers/`, `restaurants/`, `categories/`, `appSettings/`.

[firestore.rules](./firestore.rules) is identical to the POS [firebase/firestore.rules](../masoub-alqarya-pos/firebase/firestore.rules); keep both synchronized. Both POS Firebase configurations use that shared policy; the separate compatibility file was removed. Direct order updates are denied; active staff use authenticated callables for status, edits and cancellation, with server-managed preparation and audit revisions. Admin deletion remains allowed. Customer creation/counters and POS operational writes remain server-only; POS reads are scoped to active staff and branch. Deploying either rules source replaces the rules for the same shared Firebase project.

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

The shared catalog uses `menuItems.inStock` (missing means true), `isFeatured` (missing means false), and `featuredRank` (lowest first among featured items). Admin Menu provides a stock toggle and featured selection in item editing; Arrange menu controls positions. Stock is global across branches. POS Settings lets active admins and cashiers update global stock through `posAction/setItemStock`. Cashiers must act through their assigned branch; the callable changes availability only, not prices, featured status, or other catalog fields. Mobile and web receive live stock updates, label unavailable products, block adding/checkout, and check offer constituents. The customer callable re-reads stock in its order/counter transaction; unavailable or removed items are rejected before allocating a receipt number. Existing accepted orders are still fulfilled. Both customer menus use the same configured category and product positions; the app has a separately ordered featured section (see Admin content and catalog presentation).

Regular mobile products require customer size selection. Offers support `pricingType: "fixed" | "percentage"` (default fixed). Fixed bundles use admin-configured `items[].sizeId`; percentage offers use `discountPercent` and customer-selected attached sizes on mobile/web. One size choice applies to the full configured row quantity. The regular total includes the selected sizes and default cooking options. `addOfferItems(offer, menuItems, sizeOptions, selectedSizes)` creates a distinct group; the optional fourth argument maps offer-row indices to customer size IDs for percentage offers. Integer-halala allocation preserves exact totals. Reorder restores valid percentage size choices and rebuilds current pricing; unavailable offers require menu review. No legacy offer/order migration is provided during development.

POS automatic processing requires a server-issued verified `posPayments/{orderId}` proof matching branch, SAR amount, content binding and fingerprint. Card selection alone is not payment verification. Cash orders stay pending until a cashier/admin explicitly transitions them to preparing, then queued printing can run; that action does not claim cash has been collected. Paid receipt success starts preparation, and no physical print is automatically retried after dispatch uncertainty.

POS `Config.routing` saves category-to-printer-ID arrays and reads legacy single strings. All enabled printers, including the first/cashier printer, can be selected per category. A category may target several printers. Receipt printers always receive one full receipt; kitchen printers receive their routed items once. Removing/disabling one destination retains the others; changing a printer template does not remove category membership. Roll out the updated POS client and callable together. No deployment or hardware verification is implied by source changes.

## Offer pricing models

Offers use the existing `offers` collection with `items: [{menuItemId, nameEn, nameAr, sizeId, qty}]` and `pricingType: "fixed" | "percentage"` (default fixed). Fixed bundles use a positive `offerPrice` below the regular total and require admin-configured sizes (`null` for unsized products). Percentage offers use numeric `discountPercent` greater than 0 and less than 100, with up to two decimals; row `sizeId` is null and customers explicitly choose any attached size. The discount applies only to configured products/quantities, including chosen size prices and default cooking additions; extras and unrelated cart items are excluded. One size choice covers the full row quantity. Catalog per-item size additions override global additions. Percentage `offerPrice`/`originalPrice` are derived starting-price snapshots, never authoritative checkout inputs. Listings and incomplete selections show "From" prices using the cheapest remaining sizes; they do not preselect sizes in the form. Customers must complete required choices before adding.

The pure offer-pricing helper is mirrored in admin/mobile/web and checked against the POS shared implementation by focused tests. Percentage rates use integer basis points; each single-bundle total is rounded to the nearest halala, then multiplied by bundle quantity. Largest-remainder allocation splits a configured row into at most two unit-price lines where needed. Cart/order lines carry `offerId`, a distinct `offerGroupId`, `offerQty`, and `offerLineIndex`. Group quantity changes scale every constituent. `offerSizeChoices` recovers one consistent size per row from split lines for server validation and reorder. Size, cooking, and extra snapshots include stable IDs.

`submitCustomerOrder` re-reads offers, products, sizes and extras in the order/counter transaction, validates complete active groups, configured discount rates, and exact quantities/options/prices, and writes canonical snapshots/totals. Ordinary catalog prices are also verified so removing offer metadata cannot retain discounted prices. Stale/tampered carts fail with `failed-precondition` and `{reason: "cart-changed"}` before receipt allocation; clients explain how to remove/re-add affected lines. Reorders use current pricing and reject unavailable offers. Update the callable and customer/admin clients together; no rules/collection changes, dependencies, builds, or deployments are implied. This is the development contract, with no legacy fallback or data migration.

## Admin content and catalog presentation

The shared catalog uses `categories.sortOrder` and `categories.image`, and `menuItems.sortOrder` plus ordered `menuItems.images` / `offers.images` URL arrays. Admin gallery editing supports file drops, uploads, removal and handle/arrow reordering (up to 10 images, 5 MB each); the first URL is also written to `image` for covers and cart thumbnails. Item and offer detail screens in mobile/web render swipeable carousels; web also has keyboard-accessible image selectors. Category images are uploaded under `categories/`; app hero images under `appSettings/`. These new Storage paths allow public reads and image writes only by active admins. Existing upload paths remain unchanged.

Both clients use the mirrored `catalog-order.js`: categories sort by numeric `sortOrder` (default 0), then natural Arabic name (English fallback), then ID, independently of the display language. The all-products view groups by that category order. Products within a category use only `sortOrder` and the same name/ID tie-breaks; featured flags never override this order. Admin Menu provides an Arrange menu tab with category, per-category product, and featured lists; handle dragging and arrow buttons replace manual numeric editing. Saving atomically writes contiguous 1-based positions. New categories/products and newly featured products append to their respective lists. Size Options edits both `sizeOptions.nameEn` / `nameAr` and price additions without changing IDs. Mobile subscribes to categories, items, offers and sizes and caches refreshed values; web already subscribes live.

Admin `/app-settings` manages the public `appSettings/mobile` document in the existing Firebase project. `hero` contains `titleEn`, `titleAr`, `descriptionEn`, `descriptionAr`, `image`; a configured hero appears before active offers in the mobile homepage carousel. Clearing all hero text and its image restores the default presentation. `updates.ios` and `updates.android` each contain `{mode: "off"|"optional"|"forced", version: "major.minor.patch", url: "https://..."}`. Enabled policies require the matching App Store / Google Play app URL. Older app versions see a dismissible optional prompt or a blocking forced prompt; equal/newer versions and web are unaffected. Dismissal lasts for the current app session/policy. The client caches the last known settings in `@app_settings_v1` for offline use and retains a cached forced policy until server-confirmed removal or change. A first-ever offline launch without a cached policy cannot enforce a remote update.

The mobile release version is bundled from `app.json` (`expo.version`); update it for each store release. This is a store-update prompt, not an OTA publisher. Before enabling any policy, verify the target release is available on that platform and enter its real store URL. New clients must first include this gate. Use Disabled to turn off a policy. No migration, dependencies, build, deployment or live configuration changes were performed.

Manual rollout, when separately authorized: review and publish the admin Firestore and Storage rules in the same existing project (including Storage-to-Firestore access for active-admin checks), release the updated clients, then configure content, images, positions and platform policies through the admin. The POS Firestore rules mirror remains synchronized; POS behavior and backend order contracts do not change.

## Visual ordering and featured products

Admin Menu has an Arrange menu tab, plus shortcuts from Categories and each product group. Staff choose categories, products within a category, or featured products, drag handles with mouse/touch, or use up/down buttons and keyboard arrows/Home/End. Position numbers reflect the visible order. Save order commits the list atomically; drafts survive switching lists/tabs and failed saves. Concurrent list changes require Reload order. Orders contain at most 500 entries per save. Images support file drops; single-image fields can be replaced by dropping a new photo. Image ordering stays in the enclosing form draft until that form is saved.

`sortProducts` respects only category/product positions. `sortFeaturedProducts` uses `isFeatured` and independent `featuredRank`. The app homepage shows a virtualized horizontal Featured picks section of available products, ordered by featured rank. It reuses product cards and their existing detail/quick-add behavior; the section hides when empty or a category filter is selected. Featured products remain in the normal catalog too. No dependencies, collections, rules, builds, deployments or live writes were added for this change. Focused ordering/move/parity tests: `node src/lib/catalog-order.test.mjs` from the admin repository.


## Cash checkout and audited order changes

Customer checkout is cash-only in mobile and web. Payment UI shows the informational online-payment-coming-soon message without a selectable online method. The customer submission callable rejects non-cash methods before allocating an order number. The existing cash amount/change flow remains; accepting cash preparation does not record collection.

Authenticated `changeCustomerOrder` in `europe-west1` (existing POS Functions codebase/project) handles edits/cancellations for customers and staff. The owner or active branch cashier may change an order only while `pending`, without `preparationStartedAt`, and strictly less than 60 seconds after its immutable server creation time. Active admins may correct/cancel later with a mandatory reason, except an already cancelled order. UI editing covers quantities (zero removes a line), whole offer-group quantities, per-line/order notes and car details; accepted sizes/options/unit prices are retained. Empty orders use cancellation. Branch, ownership, profile revocation, expected `revision` and the server clock are checked transactionally. A request ID makes retries idempotent; a different payload cannot reuse a request ID. Changes never allocate a new receipt number. Cash-change tender amounts must still cover the new total.

Every edit/cancellation creates immutable `orders/{id}/changeHistory/{requestId}` with actor, role, reason and before/after snapshots. Cancellations also update the legacy status history and revisioned POS status audit. Active staff can read branch audit records; clients cannot write them. Shared admin/POS Firestore rules now deny direct order updates, including status changes. Admin status advancement uses `posAction/transition` so preparation and audit checks cannot be bypassed by a client write. Deploy updated callables and clients together before the reviewed rules cutover; no deployment is implied by source edits.

Active printer claims and unresolved dispatch uncertainty block changes until printing/recovery is settled. Changed pending jobs are invalidated, and `printRevision` versions future initial jobs. An edit after preparation sets `printReviewRequired`, suppressing automatic replacement printing. Staff must review existing paper and explicitly use the audited reprint controls for affected printers. Canonical ticket binding, category routing, dispatch fencing and no automatic resend after ambiguity remain intact.


## Manual attendance starts and XLSX reports

Shift templates accept `startType: "fixed" | "prayer"` and `startTime: "HH:mm"` in Asia/Riyadh. New templates default to a manual start. Fixed starts do not depend on prayer fetches or prayer offsets; employee offsets, end times, grace, overnight ownership, overlap detection and corrections still use the existing calculation functions. `startPrayer` remains the reference/morning-evening grouping for staff assignment, and prayer times remain available in the attendance reference panel. Existing prayer-based templates can still be selected explicitly. Manual-only reports can calculate/export even when the optional prayer service is unavailable.

The editable report range defaults to today through one calendar month earlier, clamped to the preceding month's last day when needed; both endpoints are included. Employee checkboxes filter the displayed monthly report and its Excel export. XLSX export uses the same `monthlyRows` and summaries, with Summary, Attendance records, Fingerprint records and Report filters sheets; it includes delays, original/waived minutes, deduction minutes, totals and selected dates/employees. Monetary deductions are not fabricated: no monetary rate exists in the current model. The browser dynamically loads `exceljs` only for export. Completed-shift scoring and existing attendance calculation/threshold logic are reused. Focused checks: `node --test --experimental-test-isolation=none --test-name-pattern="manual shifts|report defaults" src/lib/attendance/calculations.test.mjs` and `node src/lib/attendance/export.test.mjs`.

An admin's first authorized visit opens a four-step, skippable walkthrough. The sidebar can replay it. Completion/skip is stored locally as `admin_walkthrough_v1:{uid}`; it changes no server data.
