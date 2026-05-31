import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function parseAllowlist(value: string | undefined, normalize?: (value: string) => string): Set<string> {
  const raw = (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .map((s) => (normalize ? normalize(s) : s))
    .filter(Boolean);
  return new Set(raw);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!jwt) return new Response(JSON.stringify({ error: "Missing bearer token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const phoneAllowlist = parseAllowlist(Deno.env.get("ADMIN_PHONE_ALLOWLIST"));
  const emailAllowlist = parseAllowlist(Deno.env.get("ADMIN_EMAIL_ALLOWLIST"), (v) => v.toLowerCase());
  if (!phoneAllowlist.size && !emailAllowlist.size) {
    return new Response(JSON.stringify({ error: "Admin allowlist not configured" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const phone = userRes.user.phone ?? null;
  const email = userRes.user.email ? userRes.user.email.toLowerCase() : null;
  const allowed =
    (phone && phoneAllowlist.has(phone)) ||
    (email && emailAllowlist.has(email));
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin", verified: true, onboarded: true })
    .eq("id", userRes.user.id);

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
