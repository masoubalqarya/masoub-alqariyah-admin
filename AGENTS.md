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

## Companion mobile app

| | |
| --- | --- |
| **Repo path** | `D:\Dev\React Native\clients\masoub-alqarya` |
| **Agent docs** | `AGENTS.md` in that repo (open via multi-root workspace) |
| **Copilot docs** | `.github/copilot-instructions.md` in that repo |
| **Owns** | Customer ordering UI, cart, car plate, payment flow, Track Order, customer Auth → `customers/{uid}` |
| **Shared contract** | Same Firebase project; order statuses and `createOrder` payload must stay compatible with mobile `src/firebase/orders.js` |

## Companion customer website

| | |
| --- | --- |
| **Repo path** | `D:\Dev\Web\clients\masoub-alqarya-website` |
| **Agent docs** | `AGENTS.md` in that repo (open via multi-root workspace) |
| **Copilot docs** | `.github/copilot-instructions.md` in that repo |
| **Owns** | Marketing site + web drive-through ordering (guest checkout via anonymous auth; full account for `/orders`) |
| **Shared contract** | Same Firebase project; website `src/lib/orders.js` `createOrder` must stay compatible with mobile `src/firebase/orders.js` and admin `src/types/index.js` |

When changing order fields, statuses, menu shapes, or security rules: update **all three** repos’ docs and keep admin `src/types/index.js` aligned with mobile and website order writes.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (`src/app`), React 19 |
| Language | **JavaScript / JSX** — no TypeScript sources; types live as JSDoc in `src/types/index.js` |
| Paths | `@/*` → `./src/*` (`jsconfig.json`) |
| Styling | Tailwind CSS 4 + shadcn-style Radix UI under `src/components/ui/` |
| Brand color | Warm earthy primary ≈ `#8A776F` (HSL in `src/app/globals.css`) |
| Data | Firebase client SDK (`src/lib/firebase.js` — web config currently hardcoded) |
| Charts | Recharts |
| Icons | Lucide React |

Scripts: `npm run dev` | `build` | `start` | `lint`

## Roles & routing

Staff profiles live in Firestore `users/{uid}` (`role`, `isActive`, optional `restaurantId`).

| Role | Access |
| --- | --- |
| `admin` | Full sidebar UI: dashboard, orders, menu, offers, restaurants, users, analytics. Redirected away from `/pos`. |
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
| `/users` | Admin/cashier staff management |
| `/analytics` | Charts (orders, revenue, payments) |
| `/pos` | Cashier POS / kitchen board (size, cooking, extras on each line) |
| `/login` | Auth (no shell) |

## Architecture patterns

- **Client-heavy:** pages and hooks are `"use client"`. Real-time data via Firestore `onSnapshot`.
- **Data layer:** domain hooks in `src/hooks/` — prefer extending these over putting Firestore calls in page components.
  - `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useShifts`
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
src/lib/firebase.js      # Firebase init
src/lib/i18n/            # Locale provider + dictionaries
src/lib/utils.js         # cn, SAR, order helpers
src/types/index.js       # JSDoc domain models
firestore.rules          # AuthZ source of truth
storage.rules
AGENTS.md                # This file — update after each agent change
.github/copilot-instructions.md
README.md                # Human-facing docs — keep aligned with AGENTS.md
```