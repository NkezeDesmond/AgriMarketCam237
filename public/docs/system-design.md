# System Design

## Overview
The application is a single-page web app (React + TypeScript) backed by Supabase (Postgres, Auth, Storage, Realtime, Edge Functions). The UI is designed to work well on low-end devices and unstable networks.

## Frontend
### Stack
- React 18 + TypeScript + Vite
- TailwindCSS for styling and UI primitives
- React Router for navigation
- TanStack Query for data fetching/caching
- Zustand for auth/profile state
- i18next for English/French/Pidgin

### Key Modules
- Auth + onboarding: phone OTP sign-in and profile completion before accessing core features.
- Marketplace: listing browse with filters and offline fallback caching.
- Listing create/detail: listing creation with images, map-based location, ordering workflow.
- Orders: buyer/farmer order lifecycle with realtime updates.
- Chat: conversations + messages with realtime message delivery.
- Docs: manifest-driven in-app document viewer.
- Sync: offline queue status and manual sync triggers.

## Backend (Supabase)
### Auth
- Phone OTP authentication
- Profiles are automatically created on first login via a database trigger.

### Database
- Postgres tables: profiles, listings, orders, conversations, messages, market_prices, reviews
- Row Level Security (RLS) policies to protect data access

### Realtime
- Orders: client subscribes to `postgres_changes` to refresh order lists when an order changes.
- Messages: client subscribes to new `messages` rows for the active conversation.

### Storage
- Public bucket used for listing images.
- Storage policies restrict write/update/delete to listing owners (and admins).

### Edge Functions
- `admin-promote`: promotes a user to admin if their phone is in an allowlist.
- `price-predict`: forecasts market prices from historical points.
- `advisory-chat`: provides advisory Q&A responses.

## Offline-First Design
### Local Persistence
- Marketplace data is cached in IndexedDB.
- Actions performed offline are stored in an action queue.

### Sync Strategy
- When the network returns (online event) the app attempts to sync queued actions.
- A dedicated Sync screen shows queued actions and failures and allows retries.

## Security Model
- RLS is the primary enforcement mechanism for reads/writes.
- Admin-only operations are guarded with `public.is_admin()` in policies.
- Admin bootstrap is done via backend function + phone allowlist.

## Deployment
- Frontend deploy target: Vercel (SPA rewrite configured in `vercel.json`)
- Required environment variables are documented in the deployment checklist.
