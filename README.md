# Masoub AlQarya — Admin Panel

A **Next.js 16** web admin panel for the **Masoub AlQarya** (معصوب القرية) food ordering business. Built with **JavaScript / JSX**, Tailwind CSS, shadcn/ui-style components, and Firebase (Firestore, Storage, Auth).

Domain models are documented as **JSDoc** in `src/types/index.js` (not TypeScript).

Agent context for this repo lives in [`AGENTS.md`](./AGENTS.md). Copilot / IDE agent shortcuts: [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

Companion apps (same Firebase):

- **Mobile (Expo):** `D:\Dev\React Native\clients\masoub-alqarya`
- **Customer website:** `D:\Dev\Web\clients\masoub-alqarya-website` — marketing + web drive-through ordering

---

## Pickup and car service

Customers can choose car service or pickup inside the selected branch in the mobile app and website. Pickup skips car details and uses the order number for collection. Orders share `fulfillmentType` (`driveThrough` or `pickup`); older orders remain car service. For pickup, the existing `onTheWay` status is shown as **Ready for pickup** and `delivered` as **Collected**. The admin portal and POS show the method and matching actions, and POS receipt/kitchen tickets identify branch pickup.

## Features

| Page                             | Description                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Dashboard** (`/`)              | KPI cards, recent active orders overview                                                                  |
| **Orders** (`/orders`)           | Real-time live orders with status management, filters, audit trail                                        |
| **Menu** (`/menu`)               | Full menu CRUD — items, categories, sizes, extras, allergies (image optional)                             |
| **Offers** (`/offers`)           | Manage promotional offers with images                                                                     |
| **Restaurants** (`/restaurants`) | Manage restaurant locations, open/closed toggle                                                           |
| **Users** (`/users`)             | Create and manage admin/cashier staff accounts                                                            |
| **Attendance** (`/attendance`)   | Two daily prayer-based shifts, raw punches, corrections, custom-range report, settings, and device status |
| **Analytics** (`/analytics`)     | Charts & KPIs — orders over time, revenue, payment breakdown                                              |
| **Login** (`/login`)             | Email/password authentication                                                                             |

### Roles

| Role      | Access                                                   |
| --------- | -------------------------------------------------------- |
| `admin`   | Full sidebar UI                                          |
| `cashier` | nothing, used by the POS app                             |
| `user`    | Mobile/website customers — blocked from this admin panel |

### Additional Features

- **Bilingual UI** (Arabic RTL default + English LTR) — switchable from sidebar
- **Real-time updates** via Firestore `onSnapshot` listeners
- **Image uploads** to Firebase Storage (`menuItems/`, `offers/`, `restaurants/`)
- **Employee attendance** from a ZKTeco SenseFace 2A with an independent employee roster
- **Order status audit trail** (`statusHistory` on order updates)
- **Responsive** design optimized for desktop/tablet

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, JS/JSX)
- **Path alias:** `@/*` → `./src/*` (`jsconfig.json`)
- **Styling:** Tailwind CSS 4 + shadcn/ui-style Radix components
- **Brand:** Warm earthy primary ≈ `#8A776F` (`src/app/globals.css`)
- **Backend:** Firebase (Firestore, Storage, Auth) — client SDK in `src/lib/firebase.js`
- **Charts:** Recharts
- **Icons:** Lucide React

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Access to the Masoub AlQarya Firebase project (Firestore, Storage, Authentication enabled)

### 1. Clone & Install

```bash
git clone <repo-url>
cd masoub-alqarya-admin-panel
npm install
```

### 2. Firebase Configuration

Firebase web config is currently initialized in `src/lib/firebase.js`. Ensure that file points at the correct project before running locally.

Staff user **delete** also removes the Firebase Auth account. That requires the Admin SDK on the server (Node.js runtime, never Edge). Create a key in Firebase Console → Project settings → Service accounts → Generate new private key. Never commit it, and never use a `NEXT_PUBLIC_` prefix.

**Vercel (preferred):** Vercel often mangles raw service-account JSON (`"` / newlines in `private_key`). Store a Base64 blob instead:

```bash
# macOS / Linux
base64 -i service-account.json

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

Paste the output into Vercel as `FIREBASE_SERVICE_ACCOUNT_BASE64` (one line, no wrapping quotes). Redeploy after saving.

**Local `.env.local`:** JSON still works:

```
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"masoub-alqarya",...}'
```

Or split credentials:

```
FIREBASE_PROJECT_ID=masoub-alqarya
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The public ZKTeco PUSH route also requires a server-only allowlist. Set this locally and in Vercel without a `NEXT_PUBLIC_` prefix:

```env
ZKTECO_ALLOWED_SERIALS=NYU7253603435
```

Use comma-separated serial numbers when adding future terminals.

### 3. Create the First Admin User

The panel does not support self-registration. Staff need **both** a Firebase Auth account and a Firestore profile:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. **Authentication** → **Users** → **Add user** (email + password)
3. Create a document at `users/{uid}` with at least:

```js
{
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",          // "admin" | "cashier" | "user"
  isActive: true,
  restaurantId: null,     // required for cashiers
  restaurantName: null,
  createdAt: /* Timestamp */,
  updatedAt: /* Timestamp */
}
```

Additional admins and cashiers can later be created from **Users** (`/users`) in the panel.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── layout.jsx           # Root layout (RTL default)
│   ├── providers.jsx        # Auth + i18n + AppShell providers
│   ├── globals.css          # Tailwind + brand CSS variables
│   ├── page.jsx             # Dashboard (/)
│   ├── login/page.jsx       # Login
│   ├── orders/page.jsx      # Live orders management
│   ├── menu/page.jsx        # Menu (items, categories, sizes, extras)
│   ├── offers/page.jsx      # Offers management
│   ├── restaurants/page.jsx # Restaurant management
│   ├── users/page.jsx       # Staff accounts + employee roster
│   ├── attendance/page.jsx  # Employee attendance dashboard
│   ├── iclock/[...path]/     # Public ZKTeco PUSH endpoint
│   ├── api/users/[uid]/     # DELETE Auth + Firestore staff user
│   ├── analytics/page.jsx   # Analytics with charts
│
├── components/
│   ├── AppShell.jsx         # Auth guard, role redirects, layout
│   ├── Sidebar.jsx          # Admin navigation
│   └── ui/                  # Button, Card, Dialog, Table, etc.
├── hooks/
│   ├── useAuth.jsx          # Firebase Auth context & staff profile
│   ├── useOrders.js         # Orders listeners, status updates, analytics fetch
│   ├── useMenu.js           # Menu items, categories, sizes, extras, allergies
│   ├── useOffers.js         # Offers CRUD + image upload
│   ├── useRestaurants.js    # Restaurants CRUD + image upload
│   ├── useUsers.js          # Staff users CRUD; delete via Admin API
│   ├── useEmployees.js      # Independent employee attendance roster
│   ├── useAttendance.js     # Daily event aggregation + device status
├── lib/
│   ├── firebase.js          # Firebase client initialization
│   ├── firebaseAdmin.js     # Server Auth/Firestore REST helpers
│   ├── utils.js             # cn, formatSAR, order helpers
│   └── i18n/                # Internationalization
│       ├── index.jsx        # I18n provider
│       ├── en.js            # English strings
│       └── ar.js            # Arabic strings
└── types/
    └── index.js             # JSDoc typedefs for domain models
```

---

## Firestore Collections

| Collection                                               | Description                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `categories`                                             | Menu categories (public read; admin write)                                                                                 |
| `menuItems`                                              | Menu items with cooking options (public read; admin write)                                                                 |
| `sizeOptions`                                            | Size catalog cup/small/large (public read; admin write)                                                                    |
| `extrasOptions`                                          | Extra add-ons; `calories`, `allergyIds` (public read; admin write)                                                         |
| `allergiesOptions`                                       | Allergy catalog (public read; admin write)                                                                                 |
| `offers`                                                 | Promotional combo offers (public read; admin write)                                                                        |
| `restaurants`                                            | Locations and open/closed state (public read; admin write)                                                                 |
| `orders`                                                 | Orders from mobile, website, or staff (role-scoped read/update; creating customer can read own)                            |
| `users`                                                  | Staff profiles keyed by Auth UID                                                                                           |
| `shifts`                                                 | Historical cashier clock records; no client access or new writes                                                           |
| `employees`                                              | Independent attendance roster with optional terminal `zkUserId`, up to two `shiftIds`, minute offsets, and weekly days off |
| `attendanceEvents`                                       | Immutable raw SenseFace punches; server write, admin read                                                                  |
| `attendanceDevices`                                      | SenseFace model, serial, and rate-limited heartbeat                                                                        |
| `shiftTemplates`                                         | Admin-managed Fajr/Maghrib attendance shifts                                                                               |
| `attendanceSettings/default`                             | Monthly lateness threshold and prayer location/method                                                                      |
| `prayerTimes/{YYYY-MM-DD}`                               | Server-cached AlAdhan Fajr/Maghrib times and reasoned manual overrides                                                     |
| `attendanceOverrides/{employeeId}_{shiftDate}_{shiftId}` | Admin per-shift corrections with reason; legacy date-only corrections remain readable                                      |
| `customers`                                              | Customer profiles (`customers/{uid}`) written by mobile/website on sign-up; owner read/create/update; admin delete         |

### Orders Collection Schema

```js
{
  id: string,
  orderNumber: string,        // 5-digit, e.g. "00123"
  plateNumber: string,
  carModel: string,
  carColor: string,
  paymentMethod: "card" | "cash",
  cashAmount?: number,
  changeAmount?: number,
  items: OrderItem[],
  total: number,              // SAR
  status: "pending" | "preparing" | "onTheWay" | "delivered" | "cancelled",
  restaurantId: string,
  restaurantName?: string,
  statusHistory?: AuditEntry[], // appended on staff status changes
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

Order flow: `pending` → `preparing` → `onTheWay` → `delivered` (or `cancelled`).

### Users, Employees & Shifts

```js
// users/{uid}
{
  email, displayName,
  role: "admin" | "cashier" | "user",
  restaurantId?, restaurantName?,  // cashiers
  isActive: boolean,
  createdAt, updatedAt, createdBy?
}

// employees/{id}
{
  displayName: string,
  zkUserId: string | null,
  shiftIds: string[], // optional Fajr and Maghrib assignments
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

Raw `attendanceEvents` preserve the terminal row, status, verification type, work code, and local `eventTimeRaw`. New events also carry `eventTime`, parsed as Asia/Riyadh (UTC+3). Deterministic hash document IDs and create-only writes make duplicate pushes idempotent without mutating existing events.

### Prayer-based attendance and monthly reports

In Attendance Settings, create shift templates with Fajr or Maghrib start, configurable prayer offset, fixed end, next-day flag, grace, and active state. Assign an employee up to two required daily shifts in Users → Employees: one Fajr and one Maghrib. Employee arrival/departure minute offsets and weekly days off apply to both (an empty selection means every calendar day works). Existing `shiftId` records remain readable as one-shift assignments. Unassigned employees retain a raw calendar-day punch view but do not enter calculated reports. Inactive templates cannot be newly assigned but still calculate for employees already assigned to them.

The daily view uses Asia/Riyadh `shiftDate`, not just punch calendar dates. It groups an employee's shift rows under one name, while each shift row opens its own raw punches and correction details. A night shift ending at 02:00 owns its after-midnight punches. One raw punch shows no last punch. A 90-minute buffer around each expected start/end collects punches; overlapping windows are flagged instead of double-counting. Admins can enter a shift-specific, reasoned first/last punch correction or waive late minutes; raw events never change. Not-yet-completed shifts are pending/in progress, not absent.

The report defaults to the latest completed 28th–27th period. Its start/end dates are editable and inclusive (up to 366 days), including ranges crossing calendar months. Prayer times are loaded for every touched month. It counts distinct working days and completed scheduled/present/missed/late shifts after employee creation; lateness is summed across both shifts before the configured threshold is applied.

The admin-authenticated prayer-time route fetches AlAdhan's monthly city calendar (default Jeddah, Saudi Arabia, Umm Al-Qura method 4) only when needed. It caches each day in `prayerTimes` and keeps manual date overrides even when the provider configuration changes. This uses the existing server credential; no new environment variable or Firestore composite index is needed. Deploy updated `firestore.rules` before opening the new admin UI.

Attendance also requires server Firebase credentials, even when browser Firebase login and other dashboard pages work. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the shared `masoub-alqarya` service-account JSON), `FIREBASE_SERVICE_ACCOUNT` (JSON), or `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` with `FIREBASE_PROJECT_ID=masoub-alqarya`. Keep these server-only in the admin project's local environment or hosting settings; restart the development server or redeploy after changing them. Do not paste private keys into chat or commit them.

Prayer API errors distinguish 401 (missing/invalid session), 403 (account is not an active admin), and 503 (server credentials or authorization services unavailable). The client waits for Firebase Auth initialization, refreshes its token once after 401, and displays the relevant translated error. Server logs record the underlying cause without logging tokens. Changing Firestore rules cannot supply the credentials used by this API.

For report testing, Users → Employees has an **Upload demo attendance** button (admin only). Select an existing active Fajr morning shift and confirm. It creates a tagged Maghrib-to-02:00 demo night shift, up to nine tagged employees with terminal IDs 2–10 and both shift assignments, and synthetic raw punches for August and September 2026 plus the current month to date (from October 2026 onward). Rerunning the upload adds the complementary assignment and missing punches to existing tagged demo employees without changing stored raw events. Scenarios include on-time/late arrivals, 59/60/78-minute original-shift totals around the default threshold, absences, single punches, four-punch days, overnight departures, and a tagged 20-minute manual waiver. These are synthetic `source: "demo"` events, never sent through `/iclock`; the real device ID 1 and its events are untouched. Existing staff mappings for IDs 2–10 are skipped. The upload is deterministic and safe to retry; there is no automatic cleanup. Demo employee `createdAt` is backdated to August 1 so historical reports include them. No new environment variable or composite index is needed; deploy with the existing Firebase Admin credentials and updated rules.

Monthly Option B uses the configured threshold (default 60 minutes): `deductionApplies = totalLateMinutes >= monthlyLateThresholdMinutes`; `deductibleMinutes = deductionApplies ? totalLateMinutes : 0`. All minutes become deductible once the threshold is met. No SAR salary calculation is performed.

---

## Firestore Security Rules

See [firestore.rules](./firestore.rules) and [storage.rules](./storage.rules) in the project root. Firestore rules are identical to the POS [firebase/firestore.rules](../masoub-alqarya-pos/firebase/firestore.rules); keep them synchronized. Active admins and branch-assigned active cashiers can update order status metadata, while order contents, receipt numbers and POS operations remain server-managed. Both applications share one deployed ruleset.

For a rules-only rollout from the POS repository (no function build):

```sh
npx firebase-tools@14.27.0 deploy --project masoub-alqarya --config firebase.live.json --only firestore:rules
```

Deploy the customer order callable and release updated mobile/web clients before cutting over the server-only order-creation policy. Storage rules are separate and are unaffected by this command.

---

## Mobile & website integration notes

> **Important:** When staff update an order's status in Firestore, the mobile Track Order screen and the website `/track` page must reflect the change in real-time.

Customer apps should:

1. Use `onSnapshot` to listen to `doc(db, "orders", orderId)` for live status updates
2. Read the `status` field to display the current order stage
3. Avoid local timer-based status progression
4. Use Firebase Auth (email/Google, or **Anonymous Auth** for mobile and website guest checkout) to create orders — see the `orders` security rules (`userId == auth.uid` can read their own)

Orders are created from the **mobile app** and the **customer website**. Keep `createOrder` payloads compatible across all three repos.

---

## Deploy to Vercel

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repository
3. Confirm Firebase config in `src/lib/firebase.js` (or migrate to env vars and set them in Vercel)
4. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the service-account JSON) so staff delete and ZKTeco server writes can access Firebase. Raw `FIREBASE_SERVICE_ACCOUNT` JSON is unreliable on Vercel.
5. Set `ZKTECO_ALLOWED_SERIALS=NYU7253603435` (comma-separated for future devices).
6. Deploy — Vercel will auto-detect Next.js and build

```bash
# Or deploy via CLI:
npm i -g vercel
vercel
```

---

## Currency

All monetary values are in **Saudi Riyal (SAR / ر.س)**. Use `formatSAR()` from `src/lib/utils.js` in the UI.

---

## License

Private — Masoub AlQarya.

## Order notes and daily receipt numbers

Checkout supports optional notes (up to 500 characters), visible to staff and on receipts/kitchen tickets. New order numbers are assigned by the shared Firebase callable, starting at **1 per branch each Saudi calendar day**. Mobile and web share the sequence; retries and reprints keep the original number. This requires deployment of `submitCustomerOrder` and a coordinated customer-client/rules rollout; source changes alone do not activate it.

## Stock, featured catalog, and POS release

Manage shared stock in Admin Menu (or POS Settings as an admin). Featured items and their rank are configured in Admin Menu and shown first in customer menus. Unavailable items/offers cannot be checked out; the server validates stock again. Regular mobile products require sizes; fixed offers use admin-configured sizes, while percentage offers let customers choose sizes and calculate the discounted total. POS paid orders require verified payment records; cash orders wait for a cashier to start preparation. Category routing supports several printers, including the first receipt printer, with one full receipt and routed kitchen copies. Updated client/backend rollout is required; no builds/deployments are run automatically.

## Offer pricing models

Offers use the existing `offers` collection with `items: [{menuItemId, nameEn, nameAr, sizeId, qty}]` and `pricingType: "fixed" | "percentage"` (default fixed). Fixed bundles use a positive `offerPrice` below the regular total and require admin-configured sizes (`null` for unsized products). Percentage offers use numeric `discountPercent` greater than 0 and less than 100, with up to two decimals; row `sizeId` is null and customers explicitly choose any attached size. The discount applies only to configured products/quantities, including chosen size prices and default cooking additions; extras and unrelated cart items are excluded. One size choice covers the full row quantity. Catalog per-item size additions override global additions. Percentage `offerPrice`/`originalPrice` are derived starting-price snapshots, never authoritative checkout inputs. Listings and incomplete selections show "From" prices using the cheapest remaining sizes; they do not preselect sizes in the form. Customers must complete required choices before adding.

The pure offer-pricing helper is mirrored in admin/mobile/web and checked against the POS shared implementation by focused tests. Percentage rates use integer basis points; each single-bundle total is rounded to the nearest halala, then multiplied by bundle quantity. Largest-remainder allocation splits a configured row into at most two unit-price lines where needed. Cart/order lines carry `offerId`, a distinct `offerGroupId`, `offerQty`, and `offerLineIndex`. Group quantity changes scale every constituent. `offerSizeChoices` recovers one consistent size per row from split lines for server validation and reorder. Size, cooking, and extra snapshots include stable IDs.

`submitCustomerOrder` re-reads offers, products, sizes and extras in the order/counter transaction, validates complete active groups, configured discount rates, and exact quantities/options/prices, and writes canonical snapshots/totals. Ordinary catalog prices are also verified so removing offer metadata cannot retain discounted prices. Stale/tampered carts fail with `failed-precondition` and `{reason: "cart-changed"}` before receipt allocation; clients explain how to remove/re-add affected lines. Reorders use current pricing and reject unavailable offers. Update the callable and customer/admin clients together; no rules/collection changes, dependencies, builds, or deployments are implied. This is the development contract, with no legacy fallback or data migration.
