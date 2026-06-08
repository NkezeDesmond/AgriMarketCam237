import { useState } from "react";
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
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const [error, setError] = useState<string | null>(null);

  if (profile?.role === "admin") {
    navigate("/admin", { replace: true });
    return null;
  }

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
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            If your phone number or email is in the admin allowlist, you can enable admin access on this device.
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
        </CardContent>
      </Card>
    </Page>
  );
}
