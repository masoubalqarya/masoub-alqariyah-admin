# Masoub AlQarya — Admin Panel

A **Next.js 16** web admin panel for the **Masoub AlQarya** food ordering mobile app. Built with TypeScript, Tailwind CSS, shadcn/ui-style components, and Firebase (Firestore, Storage, Auth).

---

## Features

| Page                             | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| **Dashboard** (`/`)              | KPI cards, recent active orders overview                     |
| **Orders** (`/orders`)           | Real-time live orders with status management, filters        |
| **Menu** (`/menu`)               | Full menu CRUD — items, categories, sizes, extras            |
| **Offers** (`/offers`)           | Manage promotional offers with images                        |
| **Restaurants** (`/restaurants`) | Manage restaurant locations, open/closed toggle              |
| **Analytics** (`/analytics`)     | Charts & KPIs — orders over time, revenue, payment breakdown |
| **Login** (`/login`)             | Email/password authentication                                |

### Additional Features

- **Bilingual UI** (Arabic RTL + English LTR) — switchable from sidebar
- **Real-time updates** via Firestore `onSnapshot` listeners
- **Image uploads** to Firebase Storage
- **Responsive** design optimized for desktop/tablet

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 + shadcn/ui-style Radix components
- **Backend:** Firebase (Firestore, Storage, Auth)
- **Charts:** Recharts
- **Icons:** Lucide React

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project with Firestore, Storage, and Authentication enabled

### 1. Clone & Install

```bash
git clone <repo-url>
cd masoub-alqarya-admin-panel
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Create the First Admin User

Since the admin panel only supports pre-created accounts (no self-registration):

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Users**
3. Click **Add user**
4. Enter an email and password (e.g., `admin@masoub.com` / `SecurePass123`)
5. Use these credentials to log in to the admin panel

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── providers.tsx       # Auth + i18n + AppShell providers
│   ├── page.tsx            # Dashboard (/)
│   ├── login/page.tsx      # Login page
│   ├── orders/page.tsx     # Live orders management
│   ├── menu/page.tsx       # Menu management (items, categories, sizes, extras)
│   ├── offers/page.tsx     # Offers management
│   ├── restaurants/page.tsx # Restaurant management
│   └── analytics/page.tsx  # Analytics with charts
├── components/
│   ├── AppShell.tsx        # Layout wrapper with auth guard
│   ├── Sidebar.tsx         # Navigation sidebar
│   └── ui/                 # Reusable UI components (Button, Card, Dialog, etc.)
├── hooks/
│   ├── useAuth.tsx         # Firebase Auth context & hook
│   ├── useOrders.ts        # Orders Firestore hooks & actions
│   ├── useMenu.ts          # Menu items, categories, sizes, extras hooks
│   ├── useOffers.ts        # Offers Firestore hooks & actions
│   └── useRestaurants.ts   # Restaurants Firestore hooks & actions
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   ├── utils.ts            # Utility functions (cn, formatSAR, etc.)
│   └── i18n/               # Internationalization
│       ├── index.tsx        # I18n context provider
│       ├── en.ts            # English translations
│       └── ar.ts            # Arabic translations
└── types/
    └── index.ts            # TypeScript interfaces for all data models
```

---

## Firestore Collections

| Collection      | Status   | Description                                    |
| --------------- | -------- | ---------------------------------------------- |
| `categories`    | Existing | Menu categories (masoub, aseeda, drinks, etc.) |
| `menuItems`     | Existing | Individual menu items with cooking options     |
| `sizeOptions`   | Existing | Size tiers (small, medium, large)              |
| `extrasOptions` | Existing | Extra add-ons (honey, nuts, etc.)              |
| `offers`        | Existing | Promotional combo offers                       |
| `orders`        | **New**  | Created by admin panel / mobile app            |
| `restaurants`   | **New**  | Created by admin panel                         |

### Orders Collection Schema

```typescript
{
  id: string;
  orderNumber: string;        // 5-digit, e.g. "00123"
  plateNumber: string;
  carModel: string;
  carColor: string;
  paymentMethod: "card" | "cash";
  cashAmount?: number;
  changeAmount?: number;
  items: OrderItem[];
  total: number;         // SAR
  status: "pending" | "preparing" | "onTheWay" | "delivered" | "cancelled";
  restaurantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Firestore Security Rules

See `firestore.rules` and `storage.rules` in the project root. Deploy them:

```bash
firebase deploy --only firestore:rules,storage
```

---

## Mobile App Integration Notes

> **Important:** When the admin updates an order's status in Firestore, the mobile app's "Track Order" screen must reflect the change in real-time.

The mobile app should:

1. Use `onSnapshot` to listen to `doc(db, "orders", orderId)` for live status updates
2. Read the `status` field to display the current order stage
3. Remove any local timer-based status progression
4. Use Firebase Anonymous Auth (or similar) to create orders — see the `orders` security rules for the integration point

---

## Deploy to Vercel

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repository
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel's project settings
4. Deploy — Vercel will auto-detect Next.js and build

```bash
# Or deploy via CLI:
npm i -g vercel
vercel
```

---

## Currency

All monetary values are in **Saudi Riyal (SAR / ر.س)**.

---

## License

Private — Masoub AlQarya.
