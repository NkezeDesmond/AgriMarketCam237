import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1)
});

export type Env = z.infer<typeof envSchema>;

const fallbackEnv: Env = { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" };

const parsed = envSchema.safeParse(import.meta.env);

export const env: Env = parsed.success ? parsed.data : fallbackEnv;
export const envValid: boolean = parsed.success;
