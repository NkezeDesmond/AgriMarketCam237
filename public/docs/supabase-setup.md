Supabase setup checklist

Storage (images)
- Create bucket: listing-images
- Apply policies: open /docs/storage-policies.sql in this app (Docs) and paste into Supabase Dashboard → Storage → Policies (storage.objects)

Edge Function secrets
- GEMINI_API_KEY: required for price-predict + advisory-chat
- ADMIN_PHONE_ALLOWLIST: comma-separated E.164 phones, e.g. +2376XXXXXXXX,+2376YYYYYYYY

Realtime (recommended)
- Ensure Realtime is enabled for: orders, messages, conversations

Auth (phone OTP)
- Enable Phone provider
- Configure an SMS provider (Twilio/Vonage/MessageBird) in Supabase Auth settings
- Add test numbers / test OTP settings for development if needed

Auth (Google)
- Enable Google provider in Supabase → Auth → Providers
- Add OAuth redirect URLs:
  - Local: http://localhost:5183/auth/callback
  - Production: https://<your-vercel-domain>/auth/callback
