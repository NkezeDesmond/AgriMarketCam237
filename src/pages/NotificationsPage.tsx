import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { countUnreadMessages } from "../api/chat";
import { fetchMyOrders, type OrderWithListing } from "../api/orders";
import { disablePushNotifications, enablePushNotifications, getPushSubscriptionCount } from "../api/push";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { NOTIFICATIONS_HERO_IMAGE, NOTIFICATIONS_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { Page } from "../components/Page";

function needsAction(profileRole: string | null | undefined, o: OrderWithListing, userId: string): boolean {
  if (profileRole === "farmer" && o.farmer_id === userId) return o.status === "pending" || o.status === "confirmed";
  if (o.buyer_id === userId) return o.status === "in_transit" || o.status === "delivered" || o.status === "pending";
  return false;
}

export function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState<string | null>(null);

  const unreadQuery = useQuery({
    queryKey: ["unread-messages-count", user?.id ?? "none"],
    queryFn: () => countUnreadMessages(user!.id),
    enabled: Boolean(user?.id)
  });

  const pushQuery = useQuery({
    queryKey: ["push-subscriptions-count", user?.id ?? "none"],
    queryFn: () => getPushSubscriptionCount(user!.id),
    enabled: Boolean(user?.id)
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", user?.id ?? "none"],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user?.id)
  });

  const actionOrders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    if (!user) return [];
    return list.filter((o) => needsAction(profile?.role ?? null, o, user.id)).slice(0, 10);
  }, [ordersQuery.data, profile?.role, user]);

  return (
    <Page>
      <PageHero imageUrl={NOTIFICATIONS_HERO_IMAGE} imageUrlSm={NOTIFICATIONS_HERO_IMAGE_SM} title="Notifications" subtitle="Updates from chat and orders." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Unread messages in your inbox.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            {unreadQuery.isError ? <div className="text-sm text-destructive">{(unreadQuery.error as Error).message}</div> : null}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Unread</div>
              <Badge variant={unreadQuery.data ? "warning" : "default"}>{unreadQuery.data ?? 0}</Badge>
            </div>
            <Button asChild className="w-full">
              <Link to="/chat">Open chat</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Push alerts</CardTitle>
            <CardDescription>Get a phone notification when a new message arrives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pushQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            {pushQuery.isError ? <div className="text-sm text-destructive">{(pushQuery.error as Error).message}</div> : null}
            {pushError ? <div className="text-sm text-destructive">{pushError}</div> : null}
            {pushNotice ? <div className="text-sm text-muted-foreground">{pushNotice}</div> : null}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Enabled</div>
              <Badge variant={pushQuery.data ? "success" : "default"}>{pushQuery.data ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={pushBusy || Boolean(pushQuery.data)}
                onClick={() => {
                  if (!user) return;
                  setPushBusy(true);
                  setPushError(null);
                  setPushNotice(null);
                  void enablePushNotifications(user.id)
                    .then(() => setPushNotice("Enabled. You will receive notifications even when the app is closed."))
                    .then(() => pushQuery.refetch())
                    .catch((e: unknown) => setPushError(e instanceof Error ? e.message : "Failed to enable"))
                    .finally(() => setPushBusy(false));
                }}
              >
                {pushBusy ? "Enabling…" : "Enable"}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                disabled={pushBusy || !pushQuery.data}
                onClick={() => {
                  if (!user) return;
                  setPushBusy(true);
                  setPushError(null);
                  setPushNotice(null);
                  void disablePushNotifications(user.id)
                    .then(() => setPushNotice("Disabled."))
                    .then(() => pushQuery.refetch())
                    .catch((e: unknown) => setPushError(e instanceof Error ? e.message : "Failed to disable"))
                    .finally(() => setPushBusy(false));
                }}
              >
                Disable
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Orders that need your action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordersQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            {ordersQuery.isError ? <div className="text-sm text-destructive">{(ordersQuery.error as Error).message}</div> : null}

            <div className="space-y-2">
              {actionOrders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{o.listings?.title ?? "Order"}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{o.status}</div>
                    </div>
                    <Badge variant="warning">Action</Badge>
                  </div>
                </div>
              ))}
              {ordersQuery.data && actionOrders.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">No action needed right now.</div>
              ) : null}
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/orders">Open orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

