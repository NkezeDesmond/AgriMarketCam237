import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { CAMEROON_REGIONS, ONBOARDING_HERO_IMAGE, ONBOARDING_HERO_IMAGE_SM } from "../lib/constants";
import { PageHero } from "../components/PageHero";
import { useAuthStore } from "../store/authStore";
import { Page } from "../components/Page";

const schema = z
  .object({
    display_name: z.string().min(2).max(60),
    role: z.enum(["farmer", "buyer"]).optional(),
    region: z.string().min(2).max(60),
    commune: z.string().min(2).max(60)
  })
  .refine((values) => Boolean(values.role), { path: ["role"], message: "Select Buyer or Seller." });

type FormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile?.display_name ?? "",
      role:
        (profile?.role === "buyer" || profile?.role === "farmer" ? profile.role : undefined) as FormValues["role"],
      region: profile?.region ?? "",
      commune: profile?.commune ?? ""
    }
  });

  const redirectTo = useMemo(() => {
    const raw = params.get("redirect");
    if (!raw) return null;
    const decoded = raw.startsWith("%2F") ? decodeURIComponent(raw) : raw;
    if (!decoded.startsWith("/")) return null;
    if (decoded.startsWith("/auth")) return null;
    if (decoded.startsWith("/onboarding")) return null;
    return decoded;
  }, [params]);

  useEffect(() => {
    if (!user) return;
    if (profile?.onboarded) navigate(redirectTo ?? "/dashboard", { replace: true });
  }, [navigate, profile?.onboarded, redirectTo, user]);

  if (!user) return null;
  if (profile?.onboarded) return null;

  return (
    <Page>
      <PageHero imageUrl={ONBOARDING_HERO_IMAGE} imageUrlSm={ONBOARDING_HERO_IMAGE_SM} title={t("onboardingTitle")} subtitle={t("onboardingSubtitle")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("onboardingTitle")}</CardTitle>
          <CardDescription>Set up your profile so buyers and farmers can trade safely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">{t("onboardingSubtitle")}</div>

          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(async (values) => {
              if (!values.role) return;
              await updateProfile({
                display_name: values.display_name,
                role: values.role,
                region: values.region,
                commune: values.commune,
                onboarded: true
              });
              navigate(redirectTo ?? "/dashboard", { replace: true });
            })}
          >
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Basic details</div>
                <div className="text-sm text-muted-foreground">This helps other users identify you.</div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="display_name">
                  {t("displayName")}
                </label>
                <Input id="display_name" placeholder={t("displayNamePlaceholder")} {...form.register("display_name")} />
                {form.formState.errors.display_name ? (
                  <div className="text-xs text-destructive">{form.formState.errors.display_name.message}</div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold">{t("selectRole")}</div>
                <div className="text-sm text-muted-foreground">Choose what you plan to do most often.</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
                    form.watch("role") === "farmer" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                  onClick={() => form.setValue("role", "farmer", { shouldValidate: true })}
                >
                  <div className="font-semibold">{t("roleFarmer")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("roleFarmerHint")}</div>
                </button>
                <button
                  type="button"
                  className={`rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
                    form.watch("role") === "buyer" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                  onClick={() => form.setValue("role", "buyer", { shouldValidate: true })}
                >
                  <div className="font-semibold">{t("roleBuyer")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("roleBuyerHint")}</div>
                </button>
              </div>
              {form.formState.errors.role ? <div className="text-xs text-destructive">{form.formState.errors.role.message}</div> : null}
            </div>

            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Location</div>
                <div className="text-sm text-muted-foreground">Used for regional filters and local trust.</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium" htmlFor="region">
                    {t("region")}
                  </label>
                  <select
                    id="region"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.watch("region")}
                    onChange={(e) => form.setValue("region", e.target.value, { shouldValidate: true })}
                  >
                    <option value="">{t("selectRegion")}</option>
                    {CAMEROON_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.region ? <div className="text-xs text-destructive">{form.formState.errors.region.message}</div> : null}
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium" htmlFor="commune">
                    {t("commune")}
                  </label>
                  <Input id="commune" placeholder={t("communePlaceholder")} {...form.register("commune")} />
                  {form.formState.errors.commune ? <div className="text-xs text-destructive">{form.formState.errors.commune.message}</div> : null}
                </div>
              </div>
            </div>

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("saving") : t("continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
