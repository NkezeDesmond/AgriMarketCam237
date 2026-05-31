import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../api/supabase";
import type { Database } from "../types/database";
import { debugEvent } from "../lib/debug";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  promoteToAdminIfAllowed: () => Promise<void>;
  signInWithGoogle: (redirectPath?: string | null) => Promise<void>;
  requestEmailOtp: (email: string, redirectPath?: string | null) => Promise<void>;
  requestOtp: (phoneE164: string) => Promise<void>;
  verifyOtp: (phoneE164: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  error: null,
  init: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message, session: null, user: null, profile: null });
        return;
      }

      set({ session: data.session, user: data.session?.user ?? null });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
        void get().refreshProfile();
        // #region debug-point D:auth-state-change
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "D",
          location: "src/store/authStore.ts:onAuthStateChange",
          msg: "[DEBUG] Auth state changed",
          data: { hasSession: Boolean(session), userId: session?.user?.id ?? null }
        });
        // #endregion
      });

      await get().refreshProfile();
      set({ initialized: true });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), session: null, user: null, profile: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },
  signInWithGoogle: async (redirectPath) => {
    set({ loading: true, error: null });
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback${
              redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""
            }`
          : undefined;
      // #region debug-point A:oauth-start
      {
        const traceId =
          typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "A",
          location: "src/store/authStore.ts:signInWithGoogle",
          msg: "[DEBUG] Starting Google OAuth",
          traceId,
          data: {
            hasWindow: typeof window !== "undefined",
            origin: typeof window !== "undefined" ? window.location.origin : null,
            redirectTo
          }
        });
      }
      // #endregion
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo, skipBrowserRedirect: true } : { skipBrowserRedirect: true }
      });
      // #region debug-point A:oauth-result
      {
        const traceId =
          typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "A",
          location: "src/store/authStore.ts:signInWithGoogle",
          msg: "[DEBUG] Google OAuth response received",
          traceId,
          data: {
            hasUrl: Boolean(data?.url),
            error: error ? { message: error.message, name: (error as any).name, status: (error as any).status } : null
          }
        });
      }
      // #endregion
      if (!error && data?.url && typeof window !== "undefined") {
        window.location.assign(data.url);
      }
      if (error) {
        set({ error: error.message });
        throw error;
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  requestEmailOtp: async (email, redirectPath) => {
    set({ loading: true, error: null });
    try {
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback${
              redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""
            }`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: emailRedirectTo ? { shouldCreateUser: true, emailRedirectTo } : { shouldCreateUser: true }
      });
      if (error) throw error;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  requestOtp: async (phoneE164) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneE164,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) throw error;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  verifyOtp: async (phoneE164, token) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token,
        type: "sms"
      });
      if (error) throw error;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, profile: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null });
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ profile: data ?? null });
  },
  updateProfile: async (patch) => {
    const user = get().user;
    if (!user) throw new Error("Not signed in");
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.from("profiles").update(patch as any).eq("id", user.id);
      if (error) throw error;
      await get().refreshProfile();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  promoteToAdminIfAllowed: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.functions.invoke("admin-promote", { body: {} });
      if (error) throw error;
      await get().refreshProfile();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      set({ loading: false });
    }
  }
}));
