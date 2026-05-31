/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FIGMA_EMBED_URL?: string;
  readonly VITE_DEBUG_EVENT_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
