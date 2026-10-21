# Masoub AlQarya — Admin Panel

A **Next.js 16** web admin panel for the **Masoub AlQarya** (معصوب القرية) food ordering business. Built with **JavaScript / JSX**, Tailwind CSS, shadcn/ui-style components, and Firebase (Firestore, Storage, Auth).

Domain models are documented as **JSDoc** in `src/types/index.js` (not TypeScript).

Agent context for this repo lives in [`AGENTS.md`](./AGENTS.md). Copilot / IDE agent shortcuts: [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

Companion apps (same Firebase):

- **Mobile (Expo):** `D:\Dev\React Native\clients\masoub-alqarya`
- **Customer website:** `D:\Dev\Web\clients\masoub-alqarya-website` — marketing + web drive-through ordering

---

## Features

| Page                             | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| **Dashboard** (`/`)              | KPI cards, recent active orders overview                                 |
| **Orders** (`/orders`)           | Real-time live orders with status management, filters, audit trail       |
| **Menu** (`/menu`)               | Full menu CRUD — items, categories, sizes, extras, allergies (image optional) |
| **Offers** (`/offers`)           | Manage promotional offers with images                                    |
| **Restaurants** (`/restaurants`) | Manage restaurant locations, open/closed toggle                          |
| **Users** (`/users`)             | Create and manage admin/cashier staff accounts                           |
| **Attendance** (`/attendance`)   | Prayer-based daily shifts, raw punches, manual corrections, monthly report, settings, and device status |
| **Analytics** (`/analytics`)     | Charts & KPIs — orders over time, revenue, payment breakdown             |
| **POS** (`/pos`)                 | Cashier-only kanban board for restaurant orders + shift clock-in/out     |
| **Login** (`/login`)             | Email/password authentication                                            |

### Roles

| Role       | Access                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `admin`    | Full sidebar UI (all pages except `/pos`)                              |
| `cashier`  | `/pos` only — scoped to their assigned `restaurantId`                  |
| `user`     | Mobile/website customers — blocked from this admin panel           |

### Additional Features

- **Bilingual UI** (Arabic RTL default + English LTR) — switchable from sidebar / POS
- **Real-time updates** via Firestore `onSnapshot` listeners
- **Image uploads** to Firebase Storage (`menuItems/`, `offers/`, `restaurants/`)
- **Shift tracking** for cashiers (`shifts` collection)
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
│   └── pos/page.jsx         # Cashier POS / kitchen board
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
│   └── useShifts.js         # Clock-in / clock-out
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

| Collection      | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `categories`    | Menu categories (public read; admin write)                     |
| `menuItems`     | Menu items with cooking options (public read; admin write)     |
| `sizeOptions`   | Size catalog cup/small/large (public read; admin write)        |
| `extrasOptions` | Extra add-ons; `calories`, `allergyIds` (public read; admin write) |
| `allergiesOptions` | Allergy catalog (public read; admin write)                    |
| `offers`        | Promotional combo offers (public read; admin write)            |
| `restaurants`   | Locations and open/closed state (public read; admin write)     |
| `orders`        | Orders from mobile, website, or staff (role-scoped read/update; creating customer can read own) |
| `users`         | Staff profiles keyed by Auth UID                               |
| `shifts`        | Cashier clock-in / clock-out records                           |
| `employees`     | Independent attendance roster with optional terminal `zkUserId`, assigned shift, minute offsets, and weekly days off |
| `attendanceEvents` | Immutable raw SenseFace punches; server write, admin read   |
| `attendanceDevices` | SenseFace model, serial, and rate-limited heartbeat        |
| `shiftTemplates` | Admin-managed Fajr/Maghrib attendance shifts, separate from POS `shifts` |
| `attendanceSettings/default` | Monthly lateness threshold and prayer location/method |
| `prayerTimes/{YYYY-MM-DD}` | Server-cached AlAdhan Fajr/Maghrib times and reasoned manual overrides |
| `attendanceOverrides/{employeeId}_{shiftDate}` | Admin corrections with reason; raw events remain immutable |
| `customers`     | Customer profiles (`customers/{uid}`) written by mobile/website on sign-up; owner read/create/update; admin delete |

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

// shifts/{id}
{
  userId, userName, restaurantId,
  clockIn: Timestamp,
  clockOut?: Timestamp,
  isActive: boolean,
}

// employees/{id}
{
  displayName: string,
  zkUserId: string | null,
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

Raw `attendanceEvents` preserve the terminal row, status, verification type, work code, and local `eventTimeRaw`. New events also carry `eventTime`, parsed as Asia/Riyadh (UTC+3). Deterministic hash document IDs and create-only writes make duplicate pushes idempotent without mutating existing events.

### Prayer-based attendance and monthly reports

In Attendance Settings, create morning/evening shift templates with Fajr or Maghrib start, configurable prayer offset, fixed end, next-day flag, grace, and active state. Then assign each employee a shift in Users → Employees. Employee arrival/departure minute offsets are signed; select weekly days off (an empty selection means every calendar day works). No shift templates or assignments are seeded automatically. An employee without an assigned shift retains a raw calendar-day punch view but is not counted in calculated monthly working days. Inactive templates cannot be newly assigned but still calculate for employees already assigned to them.

The daily view uses Asia/Riyadh `shiftDate`, not just punch calendar dates. A night shift ending at 02:00 owns its after-midnight punches. One raw punch shows no last punch. A 90-minute buffer around the expected start/end collects punches for the shift. Admins can enter a reasoned first/last punch correction or waive late minutes; raw events never change. Only completed working shifts after employee creation enter the monthly report, so an in-progress shift is not prematurely counted absent.

The admin-authenticated prayer-time route fetches AlAdhan's monthly city calendar (default Jeddah, Saudi Arabia, Umm Al-Qura method 4) only when needed. It caches each day in `prayerTimes` and keeps manual date overrides even when the provider configuration changes. This uses the existing server credential; no new environment variable or Firestore composite index is needed. Deploy updated `firestore.rules` before opening the new admin UI.

Monthly Option B uses the configured threshold (default 60 minutes): `deductionApplies = totalLateMinutes >= monthlyLateThresholdMinutes`; `deductibleMinutes = deductionApplies ? totalLateMinutes : 0`. All minutes become deductible once the threshold is met. No SAR salary calculation is performed.

---

## Firestore Security Rules

See `firestore.rules` and `storage.rules` in the project root. Deploy them:

```bash
firebase deploy --only firestore:rules,storage
```

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
