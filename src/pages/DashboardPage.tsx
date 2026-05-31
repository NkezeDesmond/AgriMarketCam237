import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";
import { DASHBOARD_HERO_IMAGE, DASHBOARD_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { fetchMyOrders } from "../api/orders";
import { fetchMyListings } from "../api/listings";
import type { OrderStatus } from "../types/database";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function isCountedOrderStatus(status: OrderStatus): boolean {
  return status !== "cancelled";
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const ordersQuery = useQuery({
    queryKey: ["dashboard", "orders", user?.id ?? "none"],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user?.id)
  });

  const listingsQuery = useQuery({
    queryKey: ["dashboard", "listings", user?.id ?? "none"],
    queryFn: () => fetchMyListings(user!.id),
    enabled: Boolean(user?.id && profile?.role === "farmer")
  });

  const role = profile?.role ?? "buyer";

  const metrics = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const listings = listingsQuery.data ?? [];

    const buyerOrders = orders.filter((o) => o.buyer_id === user?.id);
    const farmerOrders = orders.filter((o) => o.farmer_id === user?.id);

    const countedBuyer = buyerOrders.filter((o) => isCountedOrderStatus(o.status));
    const countedFarmer = farmerOrders.filter((o) => isCountedOrderStatus(o.status));

    const buyerItems = countedBuyer.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
    const farmerItems = countedFarmer.reduce((sum, o) => sum + Number(o.quantity || 0), 0);

    const buyerSpend = countedBuyer.reduce((sum, o) => sum + Number(o.price_xaf || 0) * Number(o.quantity || 0), 0);
    const farmerRevenue = countedFarmer.reduce((sum, o) => sum + Number(o.price_xaf || 0) * Number(o.quantity || 0), 0);

    const activeFarmerListings = listings.filter((l) => l.status === "active").length;
    const soldFarmerListings = listings.filter((l) => l.status === "sold").length;

    return {
      buyer: {
        ordersTotal: buyerOrders.length,
        ordersCompleted: countedBuyer.length,
        itemsPurchased: buyerItems,
        totalSpentXaf: buyerSpend
      },
      farmer: {
        ordersTotal: farmerOrders.length,
        ordersCompleted: countedFarmer.length,
        itemsSold: farmerItems,
        revenueXaf: farmerRevenue,
        listingsTotal: listings.length,
        listingsActive: activeFarmerListings,
        listingsSold: soldFarmerListings
      }
    };
  }, [listingsQuery.data, ordersQuery.data, user?.id]);

  const title = role === "farmer" ? "Seller dashboard" : "Buyer dashboard";
  const subtitle =
    role === "farmer"
      ? "Track income, orders, and listing performance at a glance."
      : "Track purchases, spending, and recent order activity.";

  return (
    <Page width="full">
      <PageHero imageUrl={DASHBOARD_HERO_IMAGE} imageUrlSm={DASHBOARD_HERO_IMAGE_SM} title={title} subtitle={subtitle}>
        <Button asChild className="h-11 px-5">
          <Link to="/marketplace">Open marketplace</Link>
        </Button>
        {role === "farmer" ? (
          <Button asChild variant="secondary" className="h-11 px-5">
            <Link to="/listings/new">Create listing</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" className="h-11 px-5">
            <Link to="/cart">Open cart</Link>
          </Button>
        )}
      </PageHero>

      {ordersQuery.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(ordersQuery.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {role === "farmer" ? (
          <>
            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Income</CardTitle>
                <div className="text-sm text-muted-foreground">Revenue from all orders (excluding cancelled).</div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total revenue</span>
                  <span className="font-medium">{formatXaf(metrics.farmer.revenueXaf)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items sold</span>
                  <span className="font-medium">{metrics.farmer.itemsSold}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Orders counted</span>
                  <span className="font-medium">{metrics.farmer.ordersCompleted}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Orders</CardTitle>
                <div className="text-sm text-muted-foreground">All orders placed for your listings.</div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.farmer.ordersTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{metrics.farmer.ordersCompleted}</span>
                </div>
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/orders">Manage orders</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Listings</CardTitle>
                <div className="text-sm text-muted-foreground">What you have in the marketplace.</div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.farmer.listingsTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium">{metrics.farmer.listingsActive}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sold</span>
                  <span className="font-medium">{metrics.farmer.listingsSold}</span>
                </div>
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/account?tab=listings">View my listings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Purchases</CardTitle>
                <div className="text-sm text-muted-foreground">All orders (excluding cancelled).</div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total spent</span>
                  <span className="font-medium">{formatXaf(metrics.buyer.totalSpentXaf)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items purchased</span>
                  <span className="font-medium">{metrics.buyer.itemsPurchased}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Orders counted</span>
                  <span className="font-medium">{metrics.buyer.ordersCompleted}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Orders</CardTitle>
                <div className="text-sm text-muted-foreground">Everything you have ordered.</div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.buyer.ordersTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{metrics.buyer.ordersCompleted}</span>
                </div>
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/orders">View orders</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="space-y-1">
                <CardTitle>Next actions</CardTitle>
                <div className="text-sm text-muted-foreground">Quick links to keep moving.</div>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/marketplace">Browse listings</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/cart">Review cart</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/prices">Check live prices</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
