import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "https://esm.sh/web-push@3.6.7";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!jwt) return jsonResponse({ error: "Missing bearer token" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:agrimarketcameroon@gmail.com";

  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server misconfigured" }, 500);
  if (!vapidPublicKey || !vapidPrivateKey) return jsonResponse({ error: "Missing VAPID keys" }, 500);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
  if (userErr || !userRes.user) return jsonResponse({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);

  const senderId = asString(body.senderId);
  const recipientId = asString(body.recipientId);
  const message = truncate(asString(body.body), 140);

  if (!senderId || !recipientId || !message) return jsonResponse({ error: "Missing fields" }, 400);
  if (senderId !== userRes.user.id) return jsonResponse({ error: "Not allowed" }, 403);

  const { data: senderProfile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", senderId)
    .maybeSingle();

  const senderName = (senderProfile?.display_name ?? "").trim() || `User ${senderId.slice(0, 6)}`;
  const url = `/chat?to=${encodeURIComponent(senderId)}`;

  const { data: subs, error: subsErr } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", recipientId);

  if (subsErr) return jsonResponse({ error: subsErr.message }, 400);
  if (!subs || subs.length === 0) return jsonResponse({ ok: true, sent: 0 }, 200);

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let sent = 0;
  let removed = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        },
        JSON.stringify({ title: `New message from ${senderName}`, body: message, url })
      );
      sent += 1;
    } catch (e) {
      const statusCode = typeof e === "object" && e && "statusCode" in e ? Number((e as any).statusCode) : null;
      if (statusCode === 404 || statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        removed += 1;
      }
    }
  }

  return jsonResponse({ ok: true, sent, removed }, 200);
});

