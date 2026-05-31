import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useAuthStore } from "../store/authStore";
import { createListing } from "../api/createListing";
import { enqueueAction } from "../lib/offline/db";
import { debugEvent } from "../lib/debug";
import { CAMEROON_REGIONS, COMMON_CROPS, CREATE_LISTING_HERO_IMAGE, CREATE_LISTING_HERO_IMAGE_SM } from "../lib/constants";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";

const schema = z.object({
  title: z.string().min(3).max(80),
  crop_type: z.string().min(2).max(40),
  description: z.string().max(800).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(12),
  price_xaf: z.coerce.number().int().positive(),
  harvest_date: z.string().optional(),
  expiry_date: z.string().optional(),
  region: z.string().min(2).max(60),
  commune: z.string().min(2).max(60),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional()
});

type FormValues = z.infer<typeof schema>;

type LatLng = { lat: number; lng: number };

function ClickToSetMarker({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
  });
  return null;
}

export function CreateListingPage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<File[]>([]);
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queued, setQueued] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      crop_type: "",
      description: "",
      quantity: 1,
      unit: "kg",
      price_xaf: 1000,
      region: "",
      commune: ""
    }
  });

  const initialCenter: LatLng = useMemo(() => ({ lat: 4.0511, lng: 9.7679 }), []);

  const previewUrls = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  return (
    <Page width="wide">
      <PageHero
        imageUrl={CREATE_LISTING_HERO_IMAGE}
        imageUrlSm={CREATE_LISTING_HERO_IMAGE_SM}
        title="Create listing"
        subtitle="Post your offer with clear details, strong photos, and an optional pickup location."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create a listing</CardTitle>
          <CardDescription>Share details, pricing, photos, and an optional pickup location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queued ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
              Saved offline. It will sync automatically when you are online.
            </div>
          ) : null}
          {submitError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</div>
          ) : null}
          {uploadProgress ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Uploading images {uploadProgress.done}/{uploadProgress.total}…
            </div>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              if (!user) return;
              setSubmitting(true);
              setSubmitError(null);
              setQueued(false);
              setUploadProgress(null);

              const loc = picked ? { lat: picked.lat, lng: picked.lng } : null;
              const imageBlobs = images.slice(0, 5);

              try {
                // #region debug-point A:create-listing-submit
                debugEvent({
                  sessionId: "create-listing-save",
                  runId: "pre-fix",
                  hypothesisId: "A",
                  location: "src/pages/CreateListingPage.tsx:onSubmit",
                  msg: "[DEBUG] Create listing submit started",
                  data: {
                    online,
                    userId: user.id,
                    role: profile?.role ?? null,
                    imageCount: imageBlobs.length,
                    hasLocation: Boolean(loc),
                    region: values["region"],
                    commune: values["commune"],
                    crop_type: values.crop_type
                  }
                });
                // #endregion
                if (!online) {
                  await enqueueAction({
                    id: crypto.randomUUID(),
                    type: "create_listing",
                    createdAt: Date.now(),
                    payload: {
                      farmer_id: user.id,
                      title: values.title,
                      crop_type: values.crop_type,
                      description: values.description ?? null,
                      quantity: values["quantity"],
                      unit: values["unit"],
                      price_xaf: values["price_xaf"],
                      harvest_date: values["harvest_date"] || null,
                      expiry_date: values["expiry_date"] || null,
                      region: values["region"],
                      commune: values["commune"],
                      location: loc,
                      localImageBlobs: imageBlobs
                    }
                  });

                  setQueued(true);
                  setSubmitting(false);
                  // #region debug-point C:create-listing-queued
                  debugEvent({
                    sessionId: "create-listing-save",
                    runId: "pre-fix",
                    hypothesisId: "C",
                    location: "src/pages/CreateListingPage.tsx:onSubmit",
                    msg: "[DEBUG] Create listing queued offline",
                    data: { imageCount: imageBlobs.length }
                  });
                  // #endregion
                  return;
                }

                if (imageBlobs.length) setUploadProgress({ done: 0, total: imageBlobs.length });
                // #region debug-point A:create-listing-api-call
                debugEvent({
                  sessionId: "create-listing-save",
                  runId: "pre-fix",
                  hypothesisId: "A",
                  location: "src/pages/CreateListingPage.tsx:onSubmit",
                  msg: "[DEBUG] Calling createListing API",
                  data: { imageCount: imageBlobs.length }
                });
                // #endregion
                const listingId = await createListing({
                  farmer_id: user.id,
                  title: values.title,
                  crop_type: values.crop_type,
                  description: values.description ?? null,
                  quantity: values["quantity"],
                  unit: values["unit"],
                  price_xaf: values["price_xaf"],
                  harvest_date: values["harvest_date"] || null,
                  expiry_date: values["expiry_date"] || null,
                  region: values["region"],
                  commune: values["commune"],
                  location: loc,
                  imageBlobs,
                  onUploadProgress: (done, total) => setUploadProgress({ done, total })
                });

                // #region debug-point D:create-listing-success
                debugEvent({
                  sessionId: "create-listing-save",
                  runId: "pre-fix",
                  hypothesisId: "D",
                  location: "src/pages/CreateListingPage.tsx:onSubmit",
                  msg: "[DEBUG] Create listing success",
                  data: { listingId }
                });
                // #endregion
                navigate(`/listings/${listingId}`);
              } catch (e) {
                // #region debug-point A:create-listing-error
                debugEvent({
                  sessionId: "create-listing-save",
                  runId: "pre-fix",
                  hypothesisId: "A",
                  location: "src/pages/CreateListingPage.tsx:onSubmit",
                  msg: "[DEBUG] Create listing failed",
                  data: {
                    message: e instanceof Error ? e.message : String(e),
                    code: (e as any)?.code ?? null,
                    details: (e as any)?.details ?? null,
                    hint: (e as any)?.hint ?? null,
                    status: (e as any)?.status ?? null
                  }
                });
                // #endregion
                setSubmitError(e instanceof Error ? e.message : "Failed to create listing");
              } finally {
                setSubmitting(false);
                setUploadProgress(null);
              }
            })}
          >
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input id="title" placeholder="e.g. Fresh maize (50kg)" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <div className="text-xs text-destructive">{form.formState.errors.title.message}</div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="crop_type" className="text-sm font-medium">
                  Crop type
                </label>
                <Select id="crop_type" {...form.register("crop_type")}>
                  <option value="">Select a crop</option>
                  {COMMON_CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.crop_type ? (
                  <div className="text-xs text-destructive">{form.formState.errors.crop_type.message}</div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input id="quantity" inputMode="decimal" {...form.register("quantity")} />
                {form.formState.errors.quantity ? (
                  <div className="text-xs text-destructive">{form.formState.errors.quantity.message}</div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="unit" className="text-sm font-medium">
                  Unit
                </label>
                <Input id="unit" placeholder="kg, bag, crate…" {...form.register("unit")} />
              </div>
              <div className="space-y-1">
                <label htmlFor="price_xaf" className="text-sm font-medium">
                  Price (XAF)
                </label>
                <Input id="price_xaf" inputMode="numeric" {...form.register("price_xaf")} />
                {form.formState.errors.price_xaf ? (
                  <div className="text-xs text-destructive">{form.formState.errors.price_xaf.message}</div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="harvest_date" className="text-sm font-medium">
                  Harvest date
                </label>
                <Input id="harvest_date" type="date" {...form.register("harvest_date")} />
              </div>
              <div className="space-y-1">
                <label htmlFor="expiry_date" className="text-sm font-medium">
                  Expiry date
                </label>
                <Input id="expiry_date" type="date" {...form.register("expiry_date")} />
              </div>
              <div className="space-y-1">
                <label htmlFor="region" className="text-sm font-medium">
                  Region
                </label>
                <Select id="region" {...form.register("region")}>
                  <option value="">Select a region</option>
                  {CAMEROON_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.region ? (
                  <div className="text-xs text-destructive">{form.formState.errors.region.message}</div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="commune" className="text-sm font-medium">
                  Commune
                </label>
                <Input id="commune" placeholder="e.g. Bamenda I" {...form.register("commune")} />
                {form.formState.errors.commune ? (
                  <div className="text-xs text-destructive">{form.formState.errors.commune.message}</div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea id="description" className="min-h-28 resize-y" placeholder="Add quality notes, pickup details, etc." {...form.register("description")} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Images (max 5)</div>
                {images.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImages([]);
                    }}
                    disabled={submitting}
                  >
                    Clear images
                  </Button>
                ) : null}
              </div>
              <div className="rounded-xl border border-dashed border-border bg-background p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">JPG, PNG, or WEBP. Max 4MB each.</div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    Choose images
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
                    const maxBytes = 4 * 1024 * 1024;

                    const accepted: File[] = [];
                    const rejected: string[] = [];

                    for (const f of selected) {
                      if (accepted.length >= 5) break;
                      if (!allowedTypes.has(f.type)) {
                        rejected.push(`${f.name} (unsupported type)`);
                        continue;
                      }
                      if (f.size > maxBytes) {
                        rejected.push(`${f.name} (too large)`);
                        continue;
                      }
                      accepted.push(f);
                    }

                    if (rejected.length) {
                      setSubmitError(`Some images were rejected: ${rejected.slice(0, 4).join(", ")}${rejected.length > 4 ? "…" : ""}`);
                    }

                    setImages(accepted);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={submitting}
                />
              </div>
              {previewUrls.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {previewUrls.map((src) => (
                    <img key={src} src={src} alt="" className="aspect-square rounded-lg border border-border object-cover" />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">GPS location (optional)</div>
                  <div className="text-xs text-muted-foreground">Tap the map to set the pickup point.</div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setPicked({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      },
                      () => {
                        setSubmitError("Location permission denied");
                      },
                      { enableHighAccuracy: true, timeout: 10_000 }
                    );
                  }}
                >
                  Use my location
                </Button>
              </div>

              <div className="h-[320px] overflow-hidden rounded-xl border border-border">
                <MapContainer center={picked ? [picked.lat, picked.lng] : [initialCenter.lat, initialCenter.lng]} zoom={picked ? 14 : 6} className="h-full w-full" scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ClickToSetMarker onPick={setPicked} />
                  {picked ? <Marker position={[picked.lat, picked.lng]} /> : null}
                </MapContainer>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : online ? "Publish listing" : "Save offline"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
