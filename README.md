# AgriMarket Cameroon

Progressive Web App (PWA) marketplace for rural Cameroon: offline-first browsing + action queue, Supabase Auth (Phone OTP), realtime messaging, and Gemini-powered price/advisory AI via Supabase Edge Functions.

## Tech

- React 18 + TypeScript + Vite
- Tailwind CSS v3 + lightweight shadcn-style UI primitives
- React Router v6
- Zustand (auth state)
- TanStack Query v5 (server state)
- Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- PWA: Workbox via vite-plugin-pwa
- Maps: Leaflet + react-leaflet
- Tests: Vitest + Playwright

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env` from `.env.example`

```bash
cp .env.example .env
```

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIGMA_EMBED_URL` (optional)

Note: root `.env` is for frontend Vite variables only. Gemini keys used by advisory-chat and price-predict belong in Supabase Edge Function secrets, not in the frontend `.env`.

3. Run the app

```bash
npm run dev
```

### Windows note

If `npm run ...` fails due to PowerShell execution policy, use:

```bash
npm.cmd run dev
```

## Deployment (Vercel)

1. Import the repo into Vercel as a Vite project.
2. Set environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_FIGMA_EMBED_URL` (optional)
3. Deploy. Client-side routing is configured via `vercel.json`.

## Supabase operational setup

### Storage bucket + policies (required for image uploads)

The app uploads listing images to the `listing-images` bucket and depends on Storage policies.

- Policies SQL is available in-app under Docs → “Storage Policies (listing-images)” and in `docs/storage-policies.sql`.

Automatic bootstrap (creates bucket + applies policies) is available via:

```bash
# Do NOT commit this value or paste your password into chats.
export SUPABASE_DB_URL="postgresql://postgres:YOUR_PASSWORD@db.hlajvmrynbulojoymrdh.supabase.co:5432/postgres"
npm run supabase:bootstrap
```

### Edge Function secrets (required for AI + admin setup + payments)

Set in Supabase Dashboard → Edge Functions → Secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, AI Edge Functions default to `gemini-2.5-flash`)
- `ADMIN_PHONE_ALLOWLIST` (comma-separated E.164 phone numbers, e.g. +2376xxxxxxxx,+2376yyyyyyyy)
- `ADMIN_EMAIL_ALLOWLIST` (comma-separated emails for admin enable)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CAMPAY_APP_USERNAME`
- `CAMPAY_APP_PASSWORD`
- `CAMPAY_BASE_URL` (optional, defaults to `https://demo.campay.net/api`)

## Supabase schema + RLS

The initial schema and policies live in:

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_conversations.sql`
- `supabase/migrations/003_profiles_onboarding.sql`
- `supabase/migrations/004_storage_policies.sql` (no-op placeholder)

It defines:

- `profiles`, `listings`, `orders`, `market_prices`, `messages`, `reviews`
- `conversations` (chat threads)
- RLS policies for buyer/farmer/admin access patterns
- `listing-images` public bucket

## Storage policies (listing images)

Storage policies are managed in Supabase Dashboard (Storage → Policies). The recommended SQL policies are provided in:

- `docs/storage-policies.sql`

## Realtime

To use realtime UI updates (orders + chat), enable Realtime replication for these tables in Supabase:

- `orders`
- `messages`
- `conversations`

## Edge Functions (Gemini)

Edge functions are implemented as:

- `supabase/functions/price-predict`
- `supabase/functions/advisory-chat`
- `supabase/functions/admin-promote` (one-time admin setup via phone allowlist)
- `supabase/functions/campay-payment` (Campay MTN/Orange mobile money collection)

They require Supabase secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, AI Edge Functions default to `gemini-2.5-flash`)
- `ADMIN_PHONE_ALLOWLIST` (comma-separated E.164 phone numbers, e.g. +2376xxxxxxxx)
- `ADMIN_EMAIL_ALLOWLIST` (comma-separated emails)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CAMPAY_APP_USERNAME`
- `CAMPAY_APP_PASSWORD`
- `CAMPAY_BASE_URL` (optional, defaults to `https://demo.campay.net/api`)

Frontend helpers:

- `src/api/ai.ts`

## Offline-first behavior

- Listings browsing falls back to IndexedDB cache when offline.
- Creating a listing while offline writes an action into IndexedDB.
- When the device reconnects, queued actions sync automatically.

Core files:

- `src/lib/offline/db.ts`
- `src/lib/offline/sync.ts`

## Routes

- Public: `/`, `/marketplace`, `/prices`, `/docs`, `/design`
- Auth + onboarded: `/listings/new`, `/orders`, `/chat`, `/advisory`, `/sync`
- Admin: `/admin` (admin users only), `/admin-setup` (allowlist bootstrap)
