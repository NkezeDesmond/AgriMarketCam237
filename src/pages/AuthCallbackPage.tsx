import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { AUTH_HERO_IMAGE, AUTH_HERO_IMAGE_SM } from "../lib/constants";
import { debugEvent } from "../lib/debug";
import { Page } from "../components/Page";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    const rawRedirect = url.searchParams.get("redirect");
    const redirectTo = (() => {
      if (!rawRedirect) return null;
      const decoded = rawRedirect.startsWith("%2F") ? decodeURIComponent(rawRedirect) : rawRedirect;
      if (!decoded.startsWith("/")) return null;
      if (decoded.startsWith("/auth")) return null;
      return decoded;
    })();
    const onboardingPath = redirectTo ? `/onboarding?redirect=${encodeURIComponent(redirectTo)}` : "/onboarding";
    // #region debug-point C:callback-loaded
    debugEvent({
      sessionId: "google-oauth-login",
      runId: "pre-fix",
      hypothesisId: "C",
      location: "src/pages/AuthCallbackPage.tsx:useEffect",
      msg: "[DEBUG] OAuth callback loaded",
      data: {
        pathname: url.pathname,
        hasCode: Boolean(code),
        hasErrorParam: Boolean(errorParam),
        queryKeys: Array.from(url.searchParams.keys())
      }
    });
    // #endregion

    void (async () => {
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        // #region debug-point B:callback-error-param
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "B",
          location: "src/pages/AuthCallbackPage.tsx:errorParam",
          msg: "[DEBUG] OAuth callback received error param",
          data: { errorParam: decodeURIComponent(errorParam).slice(0, 200) }
        });
        // #endregion
        return;
      }

      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data.session) {
        // #region debug-point D:callback-has-session
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "D",
          location: "src/pages/AuthCallbackPage.tsx:getSession",
          msg: "[DEBUG] Session already present on callback",
          data: { userId: sessionRes.data.session.user?.id ?? null }
        });
        // #endregion
        navigate(onboardingPath, { replace: true });
        return;
      }

      if (!code) {
        setError("Sign-in did not complete. Please try again.");
        // #region debug-point C:callback-missing-code
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "C",
          location: "src/pages/AuthCallbackPage.tsx:missingCode",
          msg: "[DEBUG] No code and no session on callback",
          data: { queryKeys: Array.from(url.searchParams.keys()) }
        });
        // #endregion
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setError(error.message);
        // #region debug-point C:exchange-error
        debugEvent({
          sessionId: "google-oauth-login",
          runId: "pre-fix",
          hypothesisId: "C",
          location: "src/pages/AuthCallbackPage.tsx:exchangeCodeForSession",
          msg: "[DEBUG] exchangeCodeForSession failed",
          data: { message: error.message }
        });
        // #endregion
        return;
      }

      // #region debug-point D:exchange-success
      debugEvent({
        sessionId: "google-oauth-login",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "src/pages/AuthCallbackPage.tsx:exchangeCodeForSession",
        msg: "[DEBUG] exchangeCodeForSession success",
        data: {}
      });
      // #endregion
      navigate(onboardingPath, { replace: true });
    })().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to complete sign-in");
      // #region debug-point C:callback-uncaught
      debugEvent({
        sessionId: "google-oauth-login",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "src/pages/AuthCallbackPage.tsx:catch",
        msg: "[DEBUG] Callback handler threw",
        data: { message: e instanceof Error ? e.message : String(e) }
      });
      // #endregion
    });
  }, [navigate]);

  return (
    <Page>
      <PageHero imageUrl={AUTH_HERO_IMAGE} imageUrlSm={AUTH_HERO_IMAGE_SM} title="Signing you in…" subtitle="Completing secure authentication." />
      <Card>
        <CardHeader>
          <CardTitle>Signing you in…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {error ? <div className="text-destructive">{error}</div> : <div>Please wait.</div>}
        </CardContent>
      </Card>
    </Page>
  );
}

