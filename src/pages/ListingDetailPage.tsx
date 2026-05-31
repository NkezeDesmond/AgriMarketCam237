import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { fetchListingById } from "../api/listings";
import { placeOrder } from "../api/orders";
import { fetchListingRatingSummary, fetchListingReviews, fetchRevieweeRatingSummary } from "../api/reviews";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { enqueueAction } from "../lib/offline/db";
import { LISTING_DETAIL_HERO_IMAGE, LISTING_DETAIL_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function ListingDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ?? "";
  const validId = isUuid(id);
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const addToCart = useCartStore((s) => s.addItem);
  const [orderQty, setOrderQty] = useState<string>("1");
  const [ordering, setOrdering] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mapTilesFailed, setMapTilesFailed] = useState<boolean>(false);

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id),
    enabled: validId
  });

  const listing = listingQuery.data ?? null;
  const imageUrls = useMemo(() => listing?.image_urls ?? [], [listing?.image_urls]);
  const canOrder = Boolean(user && profile?.role === "buyer");
  const canAddToCart = !profile || profile.role === "buyer";
  const displayImage = selectedImage ?? imageUrls[0] ?? null;
  const sellerId = listing?.farmer_id ?? null;

  const reviewsQuery = useQuery({
    queryKey: ["listing-reviews", id],
    queryFn: () => fetchListingReviews(id),
    enabled: validId
  });

  const listingRatingQuery = useQuery({
    queryKey: ["listing-rating", id],
    queryFn: () => fetchListingRatingSummary(id),
    enabled: validId
  });

  const sellerRatingQuery = useQuery({
    queryKey: ["seller-rating", sellerId ?? "none"],
    queryFn: async () => {
      if (!sellerId) throw new Error("Missing seller id");
      return fetchRevieweeRatingSummary(sellerId);
    },
    enabled: Boolean(sellerId)
  });

  if (!validId) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Listing not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            This listing link is not valid.
            <div>
              <Button asChild variant="secondary">
                <Link to="/marketplace">Back to marketplace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (listingQuery.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (listingQuery.isError)
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {(listingQuery.error as Error).message}
      </div>
    );

  if (!listing) return <div className="text-sm text-muted-foreground">Listing not found.</div>;

  return (
    <Page width="xl">
      <PageHero
        imageUrl={LISTING_DETAIL_HERO_IMAGE}
        imageUrlSm={LISTING_DETAIL_HERO_IMAGE_SM}
        title={listing.title}
        subtitle={`${listing.crop_type} • ${listing.region} • ${listing.quantity} ${listing.unit}`}
        priority="low"
      >
        <Button asChild variant="outline" className="h-11 px-5">
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
        <div className="inline-flex h-11 items-center rounded-md border border-border bg-background px-4 text-sm font-semibold">
          {formatXaf(listing.price_xaf)}
        </div>
      </PageHero>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-xl leading-tight">{listing.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge>{listing.crop_type}</Badge>
                  <Badge>
                    {listing.quantity} {listing.unit}
                  </Badge>
                  <Badge>{listing.region}</Badge>
                </div>
              </div>
              <Badge variant="success" className="shrink-0">
                {formatXaf(listing.price_xaf)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid gap-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted">
                {displayImage ? <img src={displayImage} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>
              {imageUrls.length > 1 ? (
                <div className="flex gap-2 overflow-auto pb-1">
                  {imageUrls.slice(0, 5).map((u) => {
                    const active = u === displayImage;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setSelectedImage(u)}
                        className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border ${active ? "border-primary" : "border-border"} bg-muted`}
                      >
                        <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {listing.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p> : null}

            <div className="grid gap-2 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <span>Location</span>
                <span className="text-foreground">{listing.commune}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Harvest date</span>
                <span className="text-foreground">{listing.harvest_date ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Expiry date</span>
                <span className="text-foreground">{listing.expiry_date ?? "—"}</span>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">Ratings</div>
                  <div className="text-xs text-muted-foreground">Based on completed orders.</div>
                </div>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">This listing</span>
                  <span className="text-foreground">
                    {listingRatingQuery.data ? `${listingRatingQuery.data.avg_rating}/5` : "—"}{" "}
                    <span className="text-muted-foreground">({listingRatingQuery.data?.rating_count ?? 0})</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Seller</span>
                  <span className="text-foreground">
                    {sellerRatingQuery.data ? `${sellerRatingQuery.data.avg_rating}/5` : "—"}{" "}
                    <span className="text-muted-foreground">({sellerRatingQuery.data?.rating_count ?? 0})</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Reviews</CardTitle>
            <div className="text-sm text-muted-foreground">From completed orders.</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading reviews…</div> : null}
            {reviewsQuery.isError ? <div className="text-sm text-destructive">{(reviewsQuery.error as Error).message}</div> : null}
            <div className="space-y-3">
              {(reviewsQuery.data ?? []).slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{r.profiles?.display_name ?? "Buyer"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{r.rating}/5</div>
                  {r.comment ? <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.comment}</div> : null}
                </div>
              ))}
            </div>
            {reviewsQuery.data && reviewsQuery.data.length === 0 ? <div className="text-sm text-muted-foreground">No reviews yet.</div> : null}
          </CardContent>
        </Card>
        </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Order</CardTitle>
            <div className="text-sm text-muted-foreground">Send a request and track the status.</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{orderError}</div>
            ) : null}
            {orderNotice ? <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{orderNotice}</div> : null}

            <div className="grid gap-2 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Unit price</span>
                <span className="text-foreground">{formatXaf(listing.price_xaf)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span className="text-foreground">
                  <Input
                    inputMode="decimal"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    disabled={!canOrder || ordering}
                    className="h-10 w-28"
                  />
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                disabled={!canAddToCart || ordering}
                variant="outline"
                onClick={() => {
                  const qty = Number(orderQty);
                  if (!Number.isFinite(qty) || qty <= 0) {
                    setOrderError("Enter a valid quantity.");
                    return;
                  }
                  setOrderNotice(null);
                  setOrderError(null);
                  addToCart({
                    listing_id: listing.id,
                    farmer_id: listing.farmer_id,
                    title: listing.title,
                    crop_type: listing.crop_type,
                    unit: listing.unit,
                    price_xaf: listing.price_xaf,
                    quantity: qty
                  });
                  navigate(user ? "/cart" : "/auth?redirect=%2Fcart");
                }}
                className="h-11"
              >
                Add to cart
              </Button>
              <Button
                disabled={!canOrder || ordering}
                onClick={async () => {
                  if (!user) {
                    navigate("/auth");
                    return;
                  }
                  if (profile?.role !== "buyer") {
                    setOrderError("Only buyers can place orders.");
                    return;
                  }
                  const qty = Number(orderQty);
                  if (!Number.isFinite(qty) || qty <= 0) {
                    setOrderError("Enter a valid quantity.");
                    return;
                  }
                  setOrderNotice(null);
                  setOrderError(null);
                  setOrdering(true);
                  try {
                    if (!online) {
                      await enqueueAction({
                        id: crypto.randomUUID(),
                        type: "place_order",
                        createdAt: Date.now(),
                        payload: {
                          listing_id: listing.id,
                          buyer_id: user.id,
                          farmer_id: listing.farmer_id,
                          quantity: qty,
                          price_xaf: listing.price_xaf
                        }
                      });
                      setOrderNotice("Saved offline. It will sync automatically when you are online.");
                      navigate("/orders");
                      return;
                    }

                    await placeOrder({
                      listing_id: listing.id,
                      buyer_id: user.id,
                      farmer_id: listing.farmer_id,
                      quantity: qty,
                      price_xaf: listing.price_xaf
                    });
                    navigate("/orders");
                  } catch (e) {
                    setOrderError(e instanceof Error ? e.message : "Failed to place order");
                  } finally {
                    setOrdering(false);
                  }
                }}
                className="h-11"
              >
                {ordering ? "Placing…" : "Place order"}
              </Button>
              {user?.id === listing.farmer_id ? null : (
                <Button asChild variant="outline" className="h-11">
                  <Link to={`/chat?to=${encodeURIComponent(listing.farmer_id)}`}>Message seller</Link>
                </Button>
              )}
              {!canOrder ? <div className="text-xs text-muted-foreground">Only buyers can place orders.</div> : null}
              {!canAddToCart ? <div className="text-xs text-muted-foreground">Only buyers can add items to cart.</div> : null}
              {!online ? <div className="text-xs text-muted-foreground">You are offline — the order will be queued and synced automatically.</div> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map</CardTitle>
          </CardHeader>
          <CardContent>
            {listing.location ? (
              <div className="h-[360px] overflow-hidden rounded-2xl border border-border">
                {online && !mapTilesFailed ? (
                  <MapContainer
                    center={[listing.location.lat, listing.location.lng]}
                    zoom={13}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      eventHandlers={{
                        tileerror: () => setMapTilesFailed(true)
                      }}
                    />
                    <Marker position={[listing.location.lat, listing.location.lng]} />
                  </MapContainer>
                ) : (
                  <div className="flex h-full w-full flex-col items-start justify-center gap-2 bg-muted/30 p-5">
                    <div className="text-sm font-semibold text-foreground">Map unavailable</div>
                    <div className="text-sm text-muted-foreground">
                      {!online ? "You are offline. Connect to view the map." : "Map tiles failed to load. Check your connection and try again."}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No GPS location saved for this listing.</div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </Page>
  );
}
