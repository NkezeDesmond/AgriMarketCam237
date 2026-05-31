import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchListings, type ListingsFilter } from "../api/listings";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select } from "../components/ui/select";
import { useAuthStore } from "../store/authStore";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";
import { CAMEROON_REGIONS, COMMON_CROPS, MARKETPLACE_HERO_IMAGE, MARKETPLACE_HERO_IMAGE_SM } from "../lib/constants";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

export function MarketplacePage() {
  const profile = useAuthStore((s) => s.profile);
  const [search, setSearch] = useState<string>("");
  const canCreateListing = !profile || profile.role === "farmer";

  const [cropType, setCropType] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "price_low" | "price_high">("newest");

  const filter: ListingsFilter = useMemo(() => {
    const next: ListingsFilter = {};

    const s = search.trim();
    if (s) next.search = s;

    const c = cropType.trim();
    if (c) next.cropType = c;

    const r = region.trim();
    if (r) next.region = r;

    const p = priceMax.trim();
    if (p.length) next.priceMaxXaf = Number(priceMax);

    return next;
  }, [cropType, priceMax, region, search]);

  const listingsQuery = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => fetchListings(filter)
  });

  const listings = useMemo(() => {
    const list = [...(listingsQuery.data ?? [])];
    if (sort === "price_low") return list.sort((a, b) => a.price_xaf - b.price_xaf);
    if (sort === "price_high") return list.sort((a, b) => b.price_xaf - a.price_xaf);
    return list;
  }, [listingsQuery.data, sort]);

  return (
    <Page width="full">
      <PageHero
        imageUrl={MARKETPLACE_HERO_IMAGE}
        imageUrlSm={MARKETPLACE_HERO_IMAGE_SM}
        title="Marketplace"
        subtitle="Browse produce listings from farmers across Cameroon. Filter by crop, region, and price."
      >
        {canCreateListing ? (
          <Button asChild className="h-11 px-5">
            <Link to={profile?.onboarded ? "/listings/new" : "/auth?redirect=%2Flistings%2Fnew"}>New listing</Link>
          </Button>
        ) : null}
      </PageHero>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Browse listings</CardTitle>
              <div className="text-sm text-muted-foreground">Filter by crop, region, and price. Sort by newest or price.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {listingsQuery.data ? `${listingsQuery.data.length} results` : listingsQuery.isLoading ? "Loading…" : ""}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setCropType("");
                  setRegion("");
                  setPriceMax("");
                  setSort("newest");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="space-y-1 md:col-span-4">
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Maize, cassava, cocoa…" />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label htmlFor="crop" className="text-sm font-medium">
                Crop
              </label>
              <Select id="crop" value={cropType} onChange={(e) => setCropType(e.target.value)}>
                <option value="">Any crop</option>
                {COMMON_CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label htmlFor="region" className="text-sm font-medium">
                Region
              </label>
              <Select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">Any region</option>
                {CAMEROON_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="price" className="text-sm font-medium">
                Max price (XAF)
              </label>
              <Input id="price" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="50000" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="space-y-1 md:col-span-3">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort
              </label>
              <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="newest">Newest</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
              </Select>
            </div>
            <div className="md:col-span-9">
              {(search || cropType || region || priceMax) && (
                <div className="flex flex-wrap items-center gap-2 pt-6 md:justify-end md:pt-0">
                  {search ? <Badge variant="default">Search: {search}</Badge> : null}
                  {cropType ? <Badge variant="default">{cropType}</Badge> : null}
                  {region ? <Badge variant="default">{region}</Badge> : null}
                  {priceMax ? <Badge variant="default">≤ {priceMax} XAF</Badge> : null}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {listingsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading listings…</div> : null}
      {listingsQuery.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(listingsQuery.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listingsQuery.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                  </div>
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </Card>
            ))
          : listings.map((l) => {
          const cover = (l.image_urls ?? [])[0] ?? null;
          return (
            <Link key={l.id} to={`/listings/${l.id}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full overflow-hidden transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:border-border/80 group-hover:shadow-md">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3">
                    <Badge variant="success">{formatXaf(l.price_xaf)}</Badge>
                  </div>
                </div>
                <CardHeader className="space-y-2">
                  <CardTitle className="line-clamp-2 text-base">{l.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{l.crop_type}</Badge>
                    <Badge>
                      {l.quantity} {l.unit}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="truncate">
                    {l.region} • {l.commune}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {listingsQuery.data && listingsQuery.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">No listings found</div>
          <div className="mt-1 text-sm text-muted-foreground">Try adjusting filters, or create the first listing in your area.</div>
          <div className="mt-4">
            <Button asChild>
              <Link to={profile?.onboarded ? "/listings/new" : "/auth?redirect=%2Flistings%2Fnew"}>Create listing</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
