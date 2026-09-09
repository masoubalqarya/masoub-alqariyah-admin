# Masoub AlQarya Admin Panel — GitHub Copilot Instructions

Companion to [`AGENTS.md`](../AGENTS.md). Prefer AGENTS.md for living project context; keep both files aligned when architecture changes.

## Project overview

Next.js **App Router** admin panel for **Masoub AlQarya** (معصوب القرية). Staff manage menu, offers, restaurants, orders, users, analytics, and cashier POS. Firebase (Auth, Firestore, Storage). Currency **SAR**. Default UI **Arabic RTL**; English LTR toggleable.

**Companion mobile app:** `D:\Dev\React Native\clients\masoub-alqarya`  
**Companion customer website:** `D:\Dev\Web\clients\masoub-alqarya-website`  
See those repos’ `AGENTS.md` and `.github/copilot-instructions.md`. Same Firebase project and order status contract. Website owns marketing + web order create (`src/lib/orders.js`).

## Tech stack

- Next.js 16 (`src/app`), React 19, **JavaScript / JSX** (JSDoc types in `src/types/index.js`)
- Path alias `@/*` → `./src/*`
- Tailwind CSS 4 + Radix/shadcn UI under `src/components/ui/`
- Brand primary ≈ `#8A776F` (`src/app/globals.css`)
- Firebase client: `src/lib/firebase.js`
- Staff Auth+Firestore delete: `DELETE /api/users/[uid]` + `src/lib/firebaseAdmin.js` (needs `FIREBASE_SERVICE_ACCOUNT` env; never commit keys)
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
| `/users` | Staff |
| `/analytics` | Charts |
| `/pos` | Cashier board + shifts; order lines show size, cooking, extras |
| `/login` | Auth (no shell) |

## Architecture

- Client-heavy `"use client"` pages; live data via Firestore `onSnapshot`
- Domain hooks in `src/hooks/`: `useAuth`, `useOrders`, `useMenu`, `useOffers`, `useRestaurants`, `useUsers`, `useShifts` — prefer extending these over inline Firestore in pages
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
| `customers` | Owner read/create/update (`customers/{uid}`); admin delete. Written by mobile/website on full-account sign-up. |

Rules: root `firestore.rules`, `storage.rules`. Storage: `menuItems/`, `offers/`, `restaurants/`.

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
