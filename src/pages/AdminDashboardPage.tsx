import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ListingStatus, OrderStatus, UserRole } from "../types/database";
import {
  deleteReviewAdmin,
  fetchAdminKpis,
  fetchListingsAdmin,
  fetchOrdersAdmin,
  fetchProfilesAdmin,
  fetchReviewsAdmin,
  transitionOrderStatusAdmin,
  updateListingStatusAdmin,
  updateProfileAdmin
} from "../api/admin";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHero } from "../components/PageHero";
import { ADMIN_HERO_IMAGE, ADMIN_HERO_IMAGE_SM } from "../lib/constants";
import { Page } from "../components/Page";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function isoDateOnly(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"users" | "listings" | "orders" | "reviews">("users");
  const [userSearch, setUserSearch] = useState<string>("");
  const [listingStatus, setListingStatus] = useState<ListingStatus | "">("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [reviewSearch, setReviewSearch] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});

  const kpisQuery = useQuery({
    queryKey: ["admin", "kpis"],
    queryFn: () => fetchAdminKpis()
  });

  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles", userSearch],
    queryFn: () => fetchProfilesAdmin({ search: userSearch, limit: 200 })
  });

  const listingsQuery = useQuery({
    queryKey: ["admin", "listings", listingStatus],
    queryFn: () => (listingStatus ? fetchListingsAdmin({ status: listingStatus, limit: 200 }) : fetchListingsAdmin({ limit: 200 }))
  });

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", orderStatus],
    queryFn: () => (orderStatus ? fetchOrdersAdmin({ status: orderStatus, limit: 200 }) : fetchOrdersAdmin({ limit: 200 }))
  });

  const reviewsQuery = useQuery({
    queryKey: ["admin", "reviews", reviewSearch],
    queryFn: () => fetchReviewsAdmin({ search: reviewSearch, limit: 200 })
  });

  const analytics = useMemo(() => {
    const kpis = kpisQuery.data;
    if (kpis) {
      return {
        totalUsers: kpis.total_users,
        verifiedUsers: kpis.verified_users,
        suspendedUsers: kpis.suspended_users,
        onboardedUsers: kpis.onboarded_users,
        totalListings: kpis.total_listings,
        activeListings: kpis.active_listings,
        hiddenListings: kpis.hidden_listings,
        soldListings: 0,
        expiredListings: 0,
        totalOrders: kpis.total_orders,
        disputedOrders: kpis.disputed_orders,
        completedOrders: kpis.completed_orders,
        completedGmvXaf: kpis.completed_gmv_xaf
      };
    }

    const profiles = profilesQuery.data ?? [];
    const listings = listingsQuery.data ?? [];
    const verifiedUsers = profiles.filter((p) => p.verified).length;
    const suspendedUsers = profiles.filter((p) => p.suspended).length;
    const onboardedUsers = profiles.filter((p) => p.onboarded).length;

    const activeListings = listings.filter((l) => l.status === "active").length;
    const hiddenListings = listings.filter((l) => l.status === "hidden").length;
    const soldListings = listings.filter((l) => l.status === "sold").length;
    const expiredListings = listings.filter((l) => l.status === "expired").length;

    return {
      totalUsers: profiles.length,
      verifiedUsers,
      suspendedUsers,
      onboardedUsers,
      totalListings: listings.length,
      activeListings,
      hiddenListings,
      soldListings,
      expiredListings,
      totalOrders: 0,
      disputedOrders: 0,
      completedOrders: 0,
      completedGmvXaf: 0
    };
  }, [kpisQuery.data, listingsQuery.data, profilesQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<{ verified: boolean; suspended: boolean; role: UserRole; display_name: string | null; region: string | null; commune: string | null }>;
    }) => {
      await updateProfileAdmin(input.id, input.patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] });
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: async (input: { id: string; status: ListingStatus }) => {
      await updateListingStatusAdmin(input.id, input.status);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
    }
  });

  const transitionOrderMutation = useMutation({
    mutationFn: async (input: { orderId: string; status: OrderStatus; note: string | null }) => {
      await transitionOrderStatusAdmin({ orderId: input.orderId, status: input.status, note: input.note });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
    }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await deleteReviewAdmin(reviewId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    }
  });

  return (
    <Page width="full">
      <PageHero
        imageUrl={ADMIN_HERO_IMAGE}
        imageUrlSm={ADMIN_HERO_IMAGE_SM}
        title="Admin"
        subtitle="Moderate users and listings, resolve disputes, and review activity."
      >
        <Button asChild variant="secondary" className="h-11 px-5">
          <Link to="/prices">Manage prices</Link>
        </Button>
      </PageHero>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle>Users</CardTitle>
            <div className="text-sm text-muted-foreground">Verification and safety controls.</div>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{analytics.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Onboarded</span>
              <span className="font-medium">{analytics.onboardedUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verified</span>
              <span className="font-medium">{analytics.verifiedUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suspended</span>
              <span className="font-medium">{analytics.suspendedUsers}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle>Listings</CardTitle>
            <div className="text-sm text-muted-foreground">Moderation and lifecycle status.</div>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{analytics.totalListings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium">{analytics.activeListings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hidden</span>
              <span className="font-medium">{analytics.hiddenListings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sold</span>
              <span className="font-medium">{analytics.soldListings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expired</span>
              <span className="font-medium">{analytics.expiredListings}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle>Orders</CardTitle>
            <div className="text-sm text-muted-foreground">Disputes and transaction metrics.</div>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{analytics.totalOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Disputed</span>
              <span className="font-medium">{analytics.disputedOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{analytics.completedOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed GMV</span>
              <span className="font-medium">{formatXaf(analytics.completedGmvXaf)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab === "users" ? "default" : "secondary"} size="sm" onClick={() => setTab("users")}>
          Users
        </Button>
        <Button variant={tab === "listings" ? "default" : "secondary"} size="sm" onClick={() => setTab("listings")}>
          Listings
        </Button>
        <Button variant={tab === "orders" ? "default" : "secondary"} size="sm" onClick={() => setTab("orders")}>
          Orders
        </Button>
        <Button variant={tab === "reviews" ? "default" : "secondary"} size="sm" onClick={() => setTab("reviews")}>
          Reviews
        </Button>
      </div>

      {updateProfileMutation.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(updateProfileMutation.error as Error).message}
        </div>
      ) : null}
      {updateListingMutation.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(updateListingMutation.error as Error).message}
        </div>
      ) : null}
      {transitionOrderMutation.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(transitionOrderMutation.error as Error).message}
        </div>
      ) : null}
      {deleteReviewMutation.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(deleteReviewMutation.error as Error).message}
        </div>
      ) : null}

      {tab === "users" ? (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle>User management</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <div className="text-sm font-medium">Search</div>
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Phone, name, region…" />
              </div>
              <Button variant="secondary" onClick={() => setUserSearch("")}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {profilesQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading users…</div> : null}
            {profilesQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(profilesQuery.error as Error).message}
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Onboarded</th>
                  <th className="py-2 pr-3 font-medium">Verified</th>
                  <th className="py-2 pr-3 font-medium">Suspended</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {(profilesQuery.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-mono text-xs">{p.phone_e164 ?? "—"}</td>
                    <td className="py-2 pr-3">{p.display_name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <select
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                        value={p.role ?? ""}
                        onChange={(e) =>
                          updateProfileMutation.mutate({
                            id: p.id,
                            patch: { role: e.target.value as UserRole }
                          })
                        }
                        disabled={updateProfileMutation.isPending}
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="farmer">farmer</option>
                        <option value="buyer">buyer</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {(p.region ?? "—") + (p.commune ? ` • ${p.commune}` : "")}
                    </td>
                    <td className="py-2 pr-3">{p.onboarded ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">
                      <Button
                        variant={p.verified ? "default" : "secondary"}
                        onClick={() => updateProfileMutation.mutate({ id: p.id, patch: { verified: !p.verified } })}
                        disabled={updateProfileMutation.isPending}
                      >
                        {p.verified ? "Verified" : "Verify"}
                      </Button>
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        variant={p.suspended ? "default" : "secondary"}
                        onClick={() => updateProfileMutation.mutate({ id: p.id, patch: { suspended: !p.suspended } })}
                        disabled={updateProfileMutation.isPending}
                      >
                        {p.suspended ? "Suspended" : "Suspend"}
                      </Button>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{isoDateOnly(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {profilesQuery.data && profilesQuery.data.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">No users found.</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "listings" ? (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle>Listing moderation</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="w-full md:w-64">
                <div className="text-sm font-medium">Status filter</div>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={listingStatus}
                  onChange={(e) => setListingStatus(e.target.value as ListingStatus | "")}
                >
                  <option value="">All</option>
                  <option value="active">active</option>
                  <option value="hidden">hidden</option>
                  <option value="sold">sold</option>
                  <option value="expired">expired</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {listingsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading listings…</div> : null}
            {listingsQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(listingsQuery.error as Error).message}
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Crop</th>
                    <th className="py-2 pr-3 font-medium">Region</th>
                    <th className="py-2 pr-3 font-medium">Price</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(listingsQuery.data ?? []).map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-3">
                        <Link to={`/listings/${l.id}`} className="font-medium hover:underline">
                          {l.title}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{l.crop_type}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {l.region} • {l.commune}
                      </td>
                      <td className="py-2 pr-3">{formatXaf(l.price_xaf)}</td>
                      <td className="py-2 pr-3">
                        <select
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                          value={l.status}
                          onChange={(e) =>
                            updateListingMutation.mutate({
                              id: l.id,
                              status: e.target.value as ListingStatus
                            })
                          }
                          disabled={updateListingMutation.isPending}
                        >
                          <option value="active">active</option>
                          <option value="hidden">hidden</option>
                          <option value="sold">sold</option>
                          <option value="expired">expired</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{isoDateOnly(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listingsQuery.data && listingsQuery.data.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">No listings found.</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "orders" ? (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle>Order management</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="w-full md:w-64">
                <div className="text-sm font-medium">Status filter</div>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus | "")}
                >
                  <option value="">All</option>
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="in_transit">in_transit</option>
                  <option value="delivered">delivered</option>
                  <option value="completed">completed</option>
                  <option value="disputed">disputed</option>
                  <option value="rejected">rejected</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {ordersQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading orders…</div> : null}
            {ordersQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(ordersQuery.error as Error).message}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Listing</th>
                    <th className="py-2 pr-3 font-medium">Buyer</th>
                    <th className="py-2 pr-3 font-medium">Farmer</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Note</th>
                    <th className="py-2 pr-3 font-medium">Actions</th>
                    <th className="py-2 pr-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordersQuery.data ?? []).map((o) => {
                    const note = orderNotes[o.id] ?? "";
                    return (
                      <tr key={o.id} className="border-b border-border last:border-b-0">
                        <td className="py-2 pr-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{o.listing_id.slice(0, 8)}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{o.buyer_id.slice(0, 8)}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{o.farmer_id.slice(0, 8)}</td>
                        <td className="py-2 pr-3">
                          <select
                            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                            value={o.status}
                            onChange={(e) =>
                              transitionOrderMutation.mutate({
                                orderId: o.id,
                                status: e.target.value as OrderStatus,
                                note: note.trim() ? note.trim() : null
                              })
                            }
                            disabled={transitionOrderMutation.isPending}
                          >
                            <option value="pending">pending</option>
                            <option value="confirmed">confirmed</option>
                            <option value="in_transit">in_transit</option>
                            <option value="delivered">delivered</option>
                            <option value="completed">completed</option>
                            <option value="disputed">disputed</option>
                            <option value="rejected">rejected</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={note}
                            onChange={(e) => setOrderNotes((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            placeholder="Optional note"
                            disabled={transitionOrderMutation.isPending}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-2">
                            {o.status === "disputed" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    transitionOrderMutation.mutate({
                                      orderId: o.id,
                                      status: "cancelled",
                                      note: note.trim() ? note.trim() : "Resolved by admin"
                                    })
                                  }
                                  disabled={transitionOrderMutation.isPending}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    transitionOrderMutation.mutate({
                                      orderId: o.id,
                                      status: "completed",
                                      note: note.trim() ? note.trim() : "Resolved by admin"
                                    })
                                  }
                                  disabled={transitionOrderMutation.isPending}
                                >
                                  Complete
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{isoDateOnly(o.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ordersQuery.data && ordersQuery.data.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">No orders found.</div> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "reviews" ? (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle>Review moderation</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <div className="text-sm font-medium">Search</div>
                <Input value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} placeholder="Comment contains…" />
              </div>
              <Button variant="secondary" onClick={() => setReviewSearch("")}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {reviewsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading reviews…</div> : null}
            {reviewsQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(reviewsQuery.error as Error).message}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Rating</th>
                    <th className="py-2 pr-3 font-medium">Comment</th>
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Listing</th>
                    <th className="py-2 pr-3 font-medium">Reviewer</th>
                    <th className="py-2 pr-3 font-medium">Reviewee</th>
                    <th className="py-2 pr-3 font-medium">Created</th>
                    <th className="py-2 pr-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(reviewsQuery.data ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-3">{r.rating}/5</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.comment ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.order_id ? r.order_id.slice(0, 8) : "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.listing_id.slice(0, 8)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.reviewer_id.slice(0, 8)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.reviewee_id.slice(0, 8)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{isoDateOnly(r.created_at)}</td>
                      <td className="py-2 pr-3">
                        <Button size="sm" variant="outline" onClick={() => deleteReviewMutation.mutate(r.id)} disabled={deleteReviewMutation.isPending}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reviewsQuery.data && reviewsQuery.data.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">No reviews found.</div> : null}
          </CardContent>
        </Card>
      ) : null}
    </Page>
  );
}
