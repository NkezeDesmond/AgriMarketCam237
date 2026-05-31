import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchMyListings, updateMyListingStatus, type Listing } from "../api/listings";
import { supabase } from "../api/supabase";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHero } from "../components/PageHero";
import { ACCOUNT_HERO_IMAGE, ACCOUNT_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { Page } from "../components/Page";

const schema = z.object({
  first_name: z.string().min(2).max(60),
  last_name: z.string().min(2).max(60),
  role: z.enum(["farmer", "buyer"]),
  region: z.string().min(2).max(60),
  commune: z.string().min(2).max(60),
  address: z.string().max(160).optional().or(z.literal("")),
  references_text: z.string().max(200).optional().or(z.literal(""))
});

type FormValues = z.infer<typeof schema>;

type AccountTab = "profile" | "listings";

function statusVariant(status: Listing["status"]): "default" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "sold") return "default";
  if (status === "hidden") return "warning";
  return "danger";
}

export function AccountHubPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const qc = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as AccountTab | null) ?? "profile";
  const [tab, setTab] = useState<AccountTab>(initialTab === "listings" ? "listings" : "profile");

  const canManageListings = profile?.role === "farmer";

  const setTabSafe = (next: AccountTab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  const inferredNames = useMemo(() => {
    const raw = (profile?.display_name ?? "").trim();
    if (!raw) return { first: "", last: "" };
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
    return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
  }, [profile?.display_name]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      first_name: profile?.first_name ?? inferredNames.first,
      last_name: profile?.last_name ?? inferredNames.last,
      role: (profile?.role === "farmer" ? "farmer" : "buyer") as FormValues["role"],
      region: profile?.region ?? "",
      commune: profile?.commune ?? "",
      address: profile?.address ?? "",
      references_text: profile?.references_text ?? ""
    }
  });

  useEffect(() => {
    if (form.formState.isDirty) setSaveOk(false);
  }, [form.formState.isDirty]);

  const listingsQuery = useQuery({
    queryKey: ["my-listings", user?.id ?? "none"],
    queryFn: () => fetchMyListings(user!.id),
    enabled: Boolean(user?.id && canManageListings)
  });

  const profileSummary = useMemo(() => {
    const name =
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
      profile?.display_name?.trim() ||
      "";
    if (name) return name;
    return user?.email ?? profile?.phone_e164 ?? "Account";
  }, [profile?.display_name, profile?.first_name, profile?.last_name, profile?.phone_e164, user?.email]);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile?.avatar_url ?? null);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(profile?.avatar_url ?? null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile, profile?.avatar_url]);

  const initials = useMemo(() => {
    const a = (profile?.first_name ?? inferredNames.first ?? "").trim();
    const b = (profile?.last_name ?? inferredNames.last ?? "").trim();
    const i1 = a ? a[0] : "";
    const i2 = b ? b[0] : "";
    const out = `${i1}${i2}`.toUpperCase();
    return out || "U";
  }, [inferredNames.first, inferredNames.last, profile?.first_name, profile?.last_name]);

  return (
    <Page>
      <PageHero imageUrl={ACCOUNT_HERO_IMAGE} imageUrlSm={ACCOUNT_HERO_IMAGE_SM} title="Account" subtitle={profileSummary}>
        {canManageListings ? (
          <Button asChild className="h-11 px-5">
            <Link to="/listings/new">Create listing</Link>
          </Button>
        ) : null}
      </PageHero>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab === "profile" ? "default" : "secondary"} size="sm" onClick={() => setTabSafe("profile")}>
          Profile
        </Button>
        {canManageListings ? (
          <Button variant={tab === "listings" ? "default" : "secondary"} size="sm" onClick={() => setTabSafe("listings")}>
            My listings
          </Button>
        ) : null}
        <div className="ml-auto hidden text-sm text-muted-foreground sm:block">{profile?.role ?? ""}</div>
      </div>

      {tab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your details used across listings, orders, and chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{authError}</div>
            ) : null}
            {saveError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
            ) : null}
            {saveOk ? <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">Saved.</div> : null}
            {avatarError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{avatarError}</div>
            ) : null}

            <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Email</div>
                <div className="truncate text-sm font-medium text-foreground">{user?.email ?? "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Phone</div>
                <div className="truncate text-sm font-medium text-foreground">{profile?.phone_e164 ?? "—"}</div>
              </div>
            </div>

            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                setSaveError(null);
                setSaveOk(false);
                setAvatarError(null);
                try {
                  let nextAvatarUrl: string | null | undefined = undefined;
                  if (user && avatarFile) {
                    setAvatarUploading(true);
                    const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
                    const path = `${user.id}/avatar.${ext}`;
                    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, {
                      upsert: true,
                      contentType: avatarFile.type
                    });
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
                    nextAvatarUrl = data.publicUrl;
                  }

                  await updateProfile({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    display_name: `${values.first_name} ${values.last_name}`.trim(),
                    role: values.role,
                    region: values.region,
                    commune: values.commune,
                    address: values.address || null,
                    references_text: values.references_text || null,
                    ...(nextAvatarUrl ? { avatar_url: nextAvatarUrl } : {})
                  });
                  if (values.role === "farmer") {
                    await qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
                  }
                  setAvatarFile(null);
                  setSaveOk(true);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Failed to save changes";
                  if (avatarUploading || avatarFile) setAvatarError(msg);
                  else setSaveError(msg);
                } finally {
                  setAvatarUploading(false);
                }
              })}
            >
              <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Public profile</div>
                  <div className="text-sm text-muted-foreground">This is shown to other users.</div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-foreground">{initials}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setAvatarError(null);
                        setAvatarFile(f);
                      }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={avatarUploading}>
                      {avatarUploading ? "Uploading…" : "Upload photo"}
                    </Button>
                    {avatarFile ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setAvatarFile(null)} disabled={avatarUploading}>
                        Remove selection
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label htmlFor="first_name" className="text-sm font-medium">
                      First name
                    </label>
                    <Input id="first_name" placeholder="e.g. Marie" {...form.register("first_name")} />
                    {form.formState.errors.first_name ? (
                      <div className="text-xs text-destructive">{form.formState.errors.first_name.message}</div>
                    ) : null}
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="last_name" className="text-sm font-medium">
                      Second name
                    </label>
                    <Input id="last_name" placeholder="e.g. Ndzi" {...form.register("last_name")} />
                    {form.formState.errors.last_name ? (
                      <div className="text-xs text-destructive">{form.formState.errors.last_name.message}</div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="address" className="text-sm font-medium">
                    Address
                  </label>
                  <Input id="address" placeholder="Street, quarter, landmark…" {...form.register("address")} />
                  {form.formState.errors.address ? <div className="text-xs text-destructive">{form.formState.errors.address.message}</div> : null}
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="references_text" className="text-sm font-medium">
                    References
                  </label>
                  <Input id="references_text" placeholder="Extra contact / notes / reference info…" {...form.register("references_text")} />
                  {form.formState.errors.references_text ? (
                    <div className="text-xs text-destructive">{form.formState.errors.references_text.message}</div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Preferences</div>
                  <div className="text-sm text-muted-foreground">Used to tailor the marketplace experience.</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="role" className="text-sm font-medium">
                      Role
                    </label>
                    <select
                      id="role"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.watch("role")}
                      onChange={(e) => form.setValue("role", e.target.value as FormValues["role"], { shouldValidate: true })}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="farmer">Seller</option>
                    </select>
                    {form.formState.errors.role ? <div className="text-xs text-destructive">{form.formState.errors.role.message}</div> : null}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="region" className="text-sm font-medium">
                      Region
                    </label>
                    <Input id="region" placeholder="e.g. Northwest" {...form.register("region")} />
                    {form.formState.errors.region ? <div className="text-xs text-destructive">{form.formState.errors.region.message}</div> : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="commune" className="text-sm font-medium">
                    Commune
                  </label>
                  <Input id="commune" placeholder="e.g. Bamenda I" {...form.register("commune")} />
                  {form.formState.errors.commune ? <div className="text-xs text-destructive">{form.formState.errors.commune.message}</div> : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={loading || form.formState.isSubmitting}>
                  {loading || form.formState.isSubmitting ? "Saving…" : saveOk ? "Saved" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My listings</CardTitle>
            <CardDescription>Activate, hide, or mark sold.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {listingsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            {listingsQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(listingsQuery.error as Error).message}
              </div>
            ) : null}

            <div className="space-y-3">
              {(listingsQuery.data ?? []).map((l) => (
                <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        <Link className="hover:underline" to={`/listings/${l.id}`}>
                          {l.title}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {l.crop_type} • {l.region} • {l.commune}
                      </div>
                    </div>
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {l.status !== "active" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          void updateMyListingStatus(l.id, "active").then(() => qc.invalidateQueries({ queryKey: ["my-listings", user?.id] }))
                        }
                      >
                        Set active
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void updateMyListingStatus(l.id, "hidden").then(() => qc.invalidateQueries({ queryKey: ["my-listings", user?.id] }))
                        }
                      >
                        Hide
                      </Button>
                    )}
                    {l.status !== "sold" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void updateMyListingStatus(l.id, "sold").then(() => qc.invalidateQueries({ queryKey: ["my-listings", user?.id] }))
                        }
                      >
                        Mark sold
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {listingsQuery.data && listingsQuery.data.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="text-sm font-semibold">No listings yet</div>
                <div className="mt-1 text-sm text-muted-foreground">Create a listing to start receiving orders and messages.</div>
                <div className="mt-4">
                  <Button asChild>
                    <Link to="/listings/new">Create listing</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </Page>
  );
}

