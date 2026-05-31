import { supabase } from "./supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function getPushSubscriptionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function enablePushNotifications(userId: string): Promise<void> {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");
  if (typeof window === "undefined") throw new Error("Not supported");
  if (!("Notification" in window)) throw new Error("Notifications are not supported in this browser");
  if (!("serviceWorker" in navigator)) throw new Error("Service worker not available");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission not granted");

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key)
  });
  const json = sub.toJSON();
  const p256dh = json.keys?.["p256dh"] ?? "";
  const auth = json.keys?.["auth"] ?? "";
  if (!sub.endpoint || !p256dh || !auth) throw new Error("Invalid push subscription");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw error;
}

export async function disablePushNotifications(userId: string): Promise<void> {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  if (error) throw error;
}
