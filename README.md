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
│   ├── users/page.jsx       # Staff user management
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
│   └── useShifts.js         # Clock-in / clock-out
├── lib/
│   ├── firebase.js          # Firebase client initialization
│   ├── firebaseAdmin.js     # Admin SDK (staff Auth delete)
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

### Users & Shifts (staff)

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
```

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
4. Use Firebase Auth (email/Google, or **Anonymous Auth** for website guest checkout) to create orders — see the `orders` security rules (`userId == auth.uid` can read their own)

Orders are created from the **mobile app** and the **customer website**. Keep `createOrder` payloads compatible across all three repos.

---

## Deploy to Vercel

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repository
3. Confirm Firebase config in `src/lib/firebase.js` (or migrate to env vars and set them in Vercel)
4. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the service-account JSON) so staff delete can remove Auth accounts. Raw `FIREBASE_SERVICE_ACCOUNT` JSON is unreliable on Vercel.
5. Deploy — Vercel will auto-detect Next.js and build

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
