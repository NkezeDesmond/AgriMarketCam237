import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { ADMIN_HERO_IMAGE, ADMIN_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { Page } from "../components/Page";

export function AdminSetupPage() {
  const navigate = useNavigate();
  const promote = useAuthStore((s) => s.promoteToAdminIfAllowed);
  const signOut = useAuthStore((s) => s.signOut);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [navigate, profile?.role]);

  if (profile?.role === "admin") return null;

  const email = user?.email ?? null;
  const phone = user?.phone ?? null;

  return (
    <Page>
      <PageHero
        imageUrl={ADMIN_HERO_IMAGE}
        imageUrlSm={ADMIN_HERO_IMAGE_SM}
        title="Admin setup"
        subtitle="Enable admin access for approved accounts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Admin setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>Enable admin access for this account.</div>
            <div>Admin access is granted only if the email or phone on your current account is on the allowlist.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Signed-in email</div>
              <div className="mt-1 text-sm font-medium text-foreground">{email ?? "Not available on this account"}</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Signed-in phone</div>
              <div className="mt-1 text-sm font-medium text-foreground">{phone ?? "Not available on this account"}</div>
            </div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => {
              setError(null);
              void promote()
                .then(() => navigate("/admin", { replace: true }))
                .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
            }}
          >
            {loading ? "Enabling…" : "Enable admin"}
          </Button>

          <div className="space-y-3 rounded-2xl border border-border bg-muted/10 p-4">
            <div className="text-sm font-medium text-foreground">Need to use a different email or phone?</div>
            <div className="text-sm text-muted-foreground">
              Sign out, then sign in again with the method that matches your allowlist entry.
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="h-11"
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setError(null);
                  void signOut()
                    .then(() => navigate(`/auth?redirect=${encodeURIComponent("/admin-setup")}&method=email`, { replace: true }))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
                }}
              >
                Sign in with email
              </Button>
              <Button
                className="h-11"
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setError(null);
                  void signOut()
                    .then(() => navigate(`/auth?redirect=${encodeURIComponent("/admin-setup")}&method=phone`, { replace: true }))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
                }}
              >
                Sign in with phone
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
