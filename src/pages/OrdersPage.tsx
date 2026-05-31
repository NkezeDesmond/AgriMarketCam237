import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import { fetchMyOrders, fetchOrderEvents, updateOrderPaymentMethod, updateOrderStatus, type OrderWithListing } from "../api/orders";
import { createReviewForOrder, fetchMyReviewsForOrders } from "../api/reviews";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Link } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { enqueueAction } from "../lib/offline/db";
import { ORDERS_HERO_IMAGE, ORDERS_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/cn";
import type { PaymentMethod } from "../types/database";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function statusVariant(status: OrderWithListing["status"]): "default" | "success" | "warning" | "danger" {
  if (status === "completed") return "success";
  if (status === "rejected" || status === "cancelled" || status === "disputed") return "danger";
  return "warning";
}

function paymentLabel(method: PaymentMethod): string {
  if (method === "mtn_momo") return "MTN MoMo";
  if (method === "orange_money") return "Orange Money";
  return "Mastercard";
}

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusyOrderId, setActionBusyOrderId] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "buying" | "selling">("all");

  const ordersQuery = useQuery({
    queryKey: ["orders", user?.id ?? "none"],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user?.id)
  });

  const completedOrderIds = useMemo(() => {
    return (ordersQuery.data ?? []).filter((o) => o.status === "completed").map((o) => o.id);
  }, [ordersQuery.data]);

  const myReviewsQuery = useQuery({
    queryKey: ["my-reviews", user?.id ?? "none", completedOrderIds.join(",")],
    queryFn: () => fetchMyReviewsForOrders({ reviewerId: user!.id, orderIds: completedOrderIds }),
    enabled: Boolean(user?.id) && completedOrderIds.length > 0
  });

  const reviewedOrderIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of myReviewsQuery.data ?? []) {
      if (r.order_id) set.add(r.order_id);
    }
    return set;
  }, [myReviewsQuery.data]);

  const filteredOrders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    if (!user) return list;
    if (view === "buying") return list.filter((o) => o.buyer_id === user.id);
    if (view === "selling") return list.filter((o) => o.farmer_id === user.id);
    return list;
  }, [ordersQuery.data, user, view]);

  const summary = useMemo(() => {
    const list = ordersQuery.data ?? [];
    const buying = user ? list.filter((o) => o.buyer_id === user.id) : [];
    const selling = user ? list.filter((o) => o.farmer_id === user.id) : [];
    const actionNeeded = user
      ? list.filter((o) => {
          const isFarmer = profile?.role === "farmer" && o.farmer_id === user.id;
          const isBuyer = o.buyer_id === user.id;
          if (isFarmer && o.status === "pending") return true;
          if (isFarmer && o.status === "confirmed") return true;
          if (isBuyer && o.status === "pending") return true;
          if (isBuyer && o.status === "in_transit") return true;
          if (isBuyer && o.status === "delivered") return true;
          return false;
        })
      : [];
    return {
      total: list.length,
      buying: buying.length,
      selling: selling.length,
      action: actionNeeded.length
    };
  }, [ordersQuery.data, profile?.role, user]);

  const eventsQuery = useQuery({
    queryKey: ["order-events", expanded ?? "none"],
    queryFn: () => fetchOrderEvents(expanded!),
    enabled: Boolean(expanded)
  });

  const createReviewMutation = useMutation({
    mutationFn: async (input: { orderId: string; rating: number; comment: string | null }) => {
      await createReviewForOrder(input);
    },
    onSuccess: async () => {
      setReviewTarget(null);
      setReviewRating(5);
      setReviewComment("");
      await qc.invalidateQueries({ queryKey: ["my-reviews"] });
      await qc.invalidateQueries({ queryKey: ["listing-reviews"] });
      await qc.invalidateQueries({ queryKey: ["listing-rating"] });
      await qc.invalidateQueries({ queryKey: ["seller-rating"] });
    }
  });

  async function transition(orderId: string, next: OrderWithListing["status"]): Promise<void> {
    if (!user) return;
    setQueuedNotice(null);
    setActionError(null);
    setActionBusyOrderId(orderId);
    if (!online) {
      try {
        await enqueueAction({
          id: crypto.randomUUID(),
          type: "update_order_status",
          createdAt: Date.now(),
          payload: { orderId, status: next }
        });
        qc.setQueryData<OrderWithListing[]>(["orders", user.id], (prev) => {
          const list = prev ?? [];
          return list.map((o) => (o.id === orderId ? { ...o, status: next } : o));
        });
        setQueuedNotice("Saved offline. It will sync automatically when you are online.");
        return;
      } finally {
        setActionBusyOrderId(null);
      }
    }
    try {
      await updateOrderStatus(orderId, next);
      await qc.invalidateQueries({ queryKey: ["orders", user.id] });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setActionBusyOrderId(null);
    }
  }

  async function selectPayment(orderId: string, method: PaymentMethod): Promise<void> {
    if (!user) return;
    setQueuedNotice(null);
    if (!online) {
      await enqueueAction({
        id: crypto.randomUUID(),
        type: "update_order_payment",
        createdAt: Date.now(),
        payload: { orderId, method }
      });
      setQueuedNotice("Saved offline. It will sync automatically when you are online.");
      return;
    }
    await updateOrderPaymentMethod(orderId, method);
    await qc.invalidateQueries({ queryKey: ["orders", user.id] });
  }

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
        () => void qc.invalidateQueries({ queryKey: ["orders", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `farmer_id=eq.${user.id}` },
        () => void qc.invalidateQueries({ queryKey: ["orders", user.id] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user]);

  return (
    <Page width="wide">
      <PageHero
        imageUrl={ORDERS_HERO_IMAGE}
        imageUrlSm={ORDERS_HERO_IMAGE_SM}
        title="Orders"
        subtitle="Track requests, update statuses, and review the timeline for each transaction."
        right={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-medium text-muted-foreground">Action needed</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{summary.action}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-medium text-muted-foreground">Total orders</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{summary.total}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-medium text-muted-foreground">Buying</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{summary.buying}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-medium text-muted-foreground">Selling</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{summary.selling}</div>
            </div>
          </div>
        }
      />

      {queuedNotice ? <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">{queuedNotice}</div> : null}
      {actionError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{actionError}</div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Order activity</CardTitle>
              <CardDescription>Switch between buying and selling views.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={view === "all" ? "secondary" : "outline"} onClick={() => setView("all")}>
                All
              </Button>
              <Button size="sm" variant={view === "buying" ? "secondary" : "outline"} onClick={() => setView("buying")}>
                Buying
              </Button>
              <Button size="sm" variant={view === "selling" ? "secondary" : "outline"} onClick={() => setView("selling")}>
                Selling
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ordersQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
          {ordersQuery.isError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {(ordersQuery.error as Error).message}
            </div>
          ) : null}

          <div className="grid gap-4">
            {filteredOrders.map((o) => {
              const isFarmer = profile?.role === "farmer" && o.farmer_id === user?.id;
              const isBuyer = o.buyer_id === user?.id;
              const listingTitle = o.listings?.title ?? o.listing_id;
              const crop = o.listings?.crop_type ?? "crop";
              const unit = o.listings?.unit ?? "";
              const unitPrice = o.listings?.price_xaf ?? o.price_xaf;
              const open = expanded === o.id;
              const canReview = o.status === "completed" && !reviewedOrderIds.has(o.id);
              const reviewOpen = reviewTarget === o.id;
              const total = Math.round(Number(o.quantity) * Number(unitPrice));
              const busy = actionBusyOrderId === o.id;

              return (
                <Card key={o.id} className="overflow-hidden">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold">{listingTitle}</div>
                          <Badge variant="default">{crop}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {o.quantity} {unit} • Unit {formatXaf(unitPrice)} • Total {formatXaf(total)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                        {o.payment_method ? <Badge variant="default">{paymentLabel(o.payment_method)}</Badge> : null}
                      </div>
                    </div>

                    {isBuyer && !o.payment_method ? (
                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="text-xs font-medium text-muted-foreground">Choose payment method</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void selectPayment(o.id, "mtn_momo")}>
                            MTN MoMo
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void selectPayment(o.id, "orange_money")}>
                            Orange Money
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void selectPayment(o.id, "mastercard")}>
                            Mastercard
                          </Button>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Payment processing is not connected yet. This saves your preference for MVP and can be wired to a gateway later.
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                    {isFarmer && o.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => void transition(o.id, "confirmed")} disabled={busy}>
                          {busy ? "Working…" : "Confirm"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void transition(o.id, "rejected")}
                          disabled={busy}
                        >
                          {busy ? "Working…" : "Reject"}
                        </Button>
                      </>
                    ) : null}

                    {isFarmer && o.status === "confirmed" ? (
                      <Button size="sm" variant="secondary" onClick={() => void transition(o.id, "in_transit")} disabled={busy}>
                        {busy ? "Working…" : "Mark in transit"}
                      </Button>
                    ) : null}

                    {isBuyer && o.status === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => void transition(o.id, "cancelled")} disabled={busy}>
                        {busy ? "Cancelling…" : "Cancel"}
                      </Button>
                    ) : null}
                    {isBuyer && o.status === "confirmed" ? (
                      <Button size="sm" variant="outline" onClick={() => void transition(o.id, "cancelled")} disabled={busy}>
                        {busy ? "Cancelling…" : "Cancel"}
                      </Button>
                    ) : null}

                    {isBuyer && o.status === "in_transit" ? (
                      <Button size="sm" variant="secondary" onClick={() => void transition(o.id, "delivered")} disabled={busy}>
                        {busy ? "Working…" : "Mark delivered"}
                      </Button>
                    ) : null}

                    {isBuyer && o.status === "delivered" ? (
                      <Button size="sm" onClick={() => void transition(o.id, "completed")} disabled={busy}>
                        {busy ? "Working…" : "Complete order"}
                      </Button>
                    ) : null}

                    {(isBuyer || isFarmer) && (o.status === "confirmed" || o.status === "in_transit" || o.status === "delivered") ? (
                      <Button size="sm" variant="outline" onClick={() => void transition(o.id, "disputed")} disabled={busy}>
                        {busy ? "Working…" : "Raise dispute"}
                      </Button>
                    ) : null}

                    {canReview ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setReviewTarget(o.id);
                          setReviewRating(5);
                          setReviewComment("");
                        }}
                      >
                        Leave review
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded((prev) => (prev === o.id ? null : o.id))}
                    >
                      {open ? "Hide timeline" : "View timeline"}
                    </Button>
                  </div>

                  {reviewOpen ? (
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium">Review</div>
                        <Button size="sm" variant="ghost" onClick={() => setReviewTarget(null)} disabled={createReviewMutation.isPending}>
                          Dismiss
                        </Button>
                      </div>

                      {createReviewMutation.isError ? <div className="mt-2 text-sm text-destructive">{(createReviewMutation.error as Error).message}</div> : null}

                      <div className="mt-3 grid gap-3">
                        <div className="grid gap-1">
                          <div className="text-xs font-medium text-muted-foreground">Rating</div>
                          <select
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={reviewRating}
                            onChange={(e) => setReviewRating(Number(e.target.value))}
                            disabled={createReviewMutation.isPending}
                          >
                            <option value={5}>5</option>
                            <option value={4}>4</option>
                            <option value={3}>3</option>
                            <option value={2}>2</option>
                            <option value={1}>1</option>
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <div className="text-xs font-medium text-muted-foreground">Comment (optional)</div>
                          <Textarea
                            className="min-h-24"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            disabled={createReviewMutation.isPending}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              online
                                ? createReviewMutation.mutate({
                                    orderId: o.id,
                                    rating: reviewRating,
                                    comment: reviewComment.trim() ? reviewComment.trim() : null
                                  })
                                : void enqueueAction({
                                    id: crypto.randomUUID(),
                                    type: "create_review",
                                    createdAt: Date.now(),
                                    payload: {
                                      orderId: o.id,
                                      rating: reviewRating,
                                      comment: reviewComment.trim() ? reviewComment.trim() : null
                                    }
                                  }).then(() => {
                                    setReviewTarget(null);
                                    setReviewRating(5);
                                    setReviewComment("");
                                    setQueuedNotice("Saved offline. It will sync automatically when you are online.");
                                  })
                            }
                            disabled={createReviewMutation.isPending}
                          >
                            {createReviewMutation.isPending ? "Submitting…" : online ? "Submit review" : "Save offline"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewTarget(null)} disabled={createReviewMutation.isPending}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {o.status === "disputed" ? (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      This order is disputed and requires admin review.
                    </div>
                  ) : null}

                  {open ? (
                    <div className="rounded-2xl border border-border bg-background p-4">
                      {eventsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading timeline…</div> : null}
                      {eventsQuery.isError ? <div className="text-sm text-destructive">{(eventsQuery.error as Error).message}</div> : null}
                      <div className="space-y-2">
                        {(eventsQuery.data ?? []).map((e) => (
                          <div key={e.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
                            <div className="text-muted-foreground">
                              {e.from_status ? <span>{e.from_status} → </span> : null}
                              <span className="font-medium text-foreground">{e.to_status}</span>
                              {e.note ? <div className="mt-1 text-xs text-muted-foreground">{e.note}</div> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                      {eventsQuery.data && eventsQuery.data.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No timeline events yet.</div>
                      ) : null}
                    </div>
                  ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {ordersQuery.data && ordersQuery.data.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-sm font-semibold">No orders yet</div>
              <div className="mt-1 text-sm text-muted-foreground">Browse the marketplace to place an order or publish your first listing.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/marketplace">Open marketplace</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/listings/new">Create listing</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Page>
  );
}
