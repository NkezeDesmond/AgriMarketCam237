Deployment checklist (Vercel + Supabase)

Vercel environment variables
- VITE_SUPABASE_URL = https://hlajvmrynbulojoymrdh.supabase.co
- VITE_SUPABASE_ANON_KEY = (anon key from Supabase)
- VITE_FIGMA_EMBED_URL = (optional, for /design)

Important: never put service role key in Vercel frontend env vars.

Supabase settings
- Storage: bucket listing-images exists, and storage.objects policies applied (listing_images_*)
- Edge Function secrets set:
  - GEMINI_API_KEY
  - GEMINI_MODEL (optional, AI Edge Functions default to gemini-2.5-flash)
  - ADMIN_PHONE_ALLOWLIST
- Realtime replication enabled for: orders, messages, conversations
- Auth (Phone):
  - Site URL set to your Vercel domain
  - Redirect URLs include:
    - https://YOUR-VERCEL-DOMAIN.vercel.app
    - https://YOUR-VERCEL-DOMAIN.vercel.app/**

Post-deploy smoke test
- /marketplace loads
- Create listing uploads images (online)
- Orders realtime updates (2 users)
- Chat realtime works (2 users)
- /prices loads + AI forecast works
- /advisory works
- /docs loads + opens PDFs/text
- Install as PWA and verify offline browse + /sync shows queued actions

Note
- Vercel `.env` / frontend env vars do not power Supabase Edge Functions.
- AI keys for advisory-chat and price-predict must be stored in Supabase Edge Function secrets.
