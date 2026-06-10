import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { Page } from "../components/Page";
import { PageHero } from "../components/PageHero";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { useAuthStore } from "../store/authStore";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { enqueueAction } from "../lib/offline/db";
import { placeOrder } from "../api/orders";
import type { PaymentMethod } from "../types/database";
import { ORDERS_HERO_IMAGE, ORDERS_HERO_IMAGE_SM } from "../lib/constants";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function paymentLabel(method: PaymentMethod): string {
  if (method === "mtn_momo") return "MTN MoMo";
  if (method === "orange_money") return "Orange Money";
  return "Mastercard";
}

export function CartPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const online = useOnlineStatus();

  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + Math.round(Number(i.quantity) * Number(i.price_xaf)), 0);
  }, [items]);

  async function checkout() {
    if (!user) return;
    if (profile?.role !== "buyer") return;
    if (!method) return;
    if (items.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      if (!online) {
        for (const i of items) {
          await enqueueAction({
            id: crypto.randomUUID(),
            type: "place_order",
            createdAt: Date.now(),
            payload: {
              listing_id: i.listing_id,
              buyer_id: user.id,
              farmer_id: i.farmer_id,
              quantity: i.quantity,
              price_xaf: i.price_xaf,
              payment_method: method
            }
          });
        }
        clear();
        navigate("/orders");
        return;
      }

      for (const i of items) {
        await placeOrder({
          listing_id: i.listing_id,
          buyer_id: user.id,
          farmer_id: i.farmer_id,
          quantity: i.quantity,
          price_xaf: i.price_xaf,
          payment_method: method
        });
      }
      clear();
      navigate("/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="wide">
      <PageHero
        imageUrl={ORDERS_HERO_IMAGE}
        imageUrlSm={ORDERS_HERO_IMAGE_SM}
        title="Cart"
        subtitle="Add multiple items, then pick a payment method when you are ready to checkout."
      >
        <Button asChild variant="outline" className="h-11 px-6">
          <Link to="/marketplace">Continue shopping</Link>
        </Button>
      </PageHero>

      {!user ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Sign in to checkout and track your orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11">
              <Link to="/auth?redirect=%2Fcart">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {user && profile?.role !== "buyer" ? (
        <Card>
          <CardHeader>
            <CardTitle>Buyer only</CardTitle>
            <CardDescription>Only buyer accounts can checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="h-11">
              <Link to="/account">Open account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Items</CardTitle>
              <CardDescription>Adjust quantities before checkout.</CardDescription>
            </div>
            {items.length ? (
              <Button size="sm" variant="outline" onClick={() => clear()} disabled={busy}>
                Clear cart
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-sm font-semibold">Your cart is empty</div>
              <div className="mt-1 text-sm text-muted-foreground">Browse the marketplace and add items to your cart.</div>
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link to="/marketplace">Open marketplace</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((i) => {
                const lineTotal = Math.round(Number(i.quantity) * Number(i.price_xaf));
                return (
                  <div key={i.listing_id} className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-foreground">{i.title}</div>
                          <Badge variant="secondary">{i.crop_type}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Unit {formatXaf(i.price_xaf)} • Total {formatXaf(lineTotal)}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeItem(i.listing_id)} disabled={busy}>
                        Remove
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="text-xs font-medium text-muted-foreground">Quantity</div>
                      <Input
                        inputMode="decimal"
                        className="h-10 w-28"
                        value={String(i.quantity)}
                        onChange={(e) => setQuantity(i.listing_id, Number(e.target.value))}
                        disabled={busy}
                      />
                      <div className="text-xs text-muted-foreground">{i.unit}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {items.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checkout</CardTitle>
            <CardDescription>Select a payment method and place your orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="text-xs font-medium text-muted-foreground">Payment method</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["mtn_momo", "orange_money", "mastercard"] as const).map((m) => (
                  <Button key={m} size="sm" variant={method === m ? "secondary" : "outline"} onClick={() => setMethod(m)} disabled={busy}>
                    {paymentLabel(m)}
                  </Button>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                For MTN MoMo or Orange Money, place the order first, then open Orders and tap Pay now to send the mobile money prompt.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Total</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{formatXaf(total)}</div>
              </div>
              <Button
                className="h-11"
                onClick={() => void checkout()}
                disabled={!user || profile?.role !== "buyer" || !method || busy || items.length === 0}
              >
                {busy ? "Processing…" : "Checkout"}
              </Button>
            </div>

            {!online ? (
              <div className="text-xs text-muted-foreground">You are offline — checkout will be queued and synced automatically when you are online.</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </Page>
  );
}
