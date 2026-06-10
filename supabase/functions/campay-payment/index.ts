import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type OrderRow = {
  id: string;
  buyer_id: string;
  quantity: number;
  price_xaf: number;
  payment_method: string | null;
  payment_status: string;
  payment_reference: string | null;
  payment_external_reference: string | null;
  payment_phone_e164: string | null;
};

type CampayCollectResponse = {
  reference?: string;
  ussd_code?: string;
  operator?: string;
  status?: string;
  message?: string;
};

type CampayStatusResponse = {
  reference?: string;
  external_reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  operator?: string;
  code?: string;
  operator_reference?: string;
  description?: string;
  reason?: string;
  phone_number?: string;
  message?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getCampayBaseUrl(): string {
  const raw = Deno.env.get("CAMPAY_BASE_URL") || "https://demo.campay.net/api";
  return raw.replace(/\/+$/, "");
}

function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+237")) return digits;
  if (digits.startsWith("237")) return `+${digits}`;
  if (digits.startsWith("6")) return `+237${digits}`;
  throw new Error("Enter a valid Cameroon phone number");
}

function phoneForCampay(phoneE164: string): string {
  return phoneE164.replace(/^\+/, "");
}

function amountForOrder(order: OrderRow): number {
  return Math.max(1, Math.round(Number(order.quantity) * Number(order.price_xaf)));
}

function mapCampayStatus(status: string | null | undefined): "pending" | "paid" | "failed" {
  const value = String(status ?? "").toUpperCase();
  if (value.startsWith("SUCCESS")) return "paid";
  if (value === "FAILED") return "failed";
  return "pending";
}

async function getCampayToken(): Promise<string> {
  const username = getRequiredEnv("CAMPAY_APP_USERNAME");
  const password = getRequiredEnv("CAMPAY_APP_PASSWORD");
  const res = await fetch(`${getCampayBaseUrl()}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.token) {
    const msg = typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : "Campay token request failed";
    throw new Error(msg);
  }
  return data.token as string;
}

async function callCampayCollect(token: string, payload: Record<string, unknown>): Promise<CampayCollectResponse> {
  const res = await fetch(`${getCampayBaseUrl()}/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : "Campay collection request failed";
    throw new Error(msg);
  }
  return data as CampayCollectResponse;
}

async function callCampayStatus(token: string, reference: string): Promise<CampayStatusResponse> {
  const res = await fetch(`${getCampayBaseUrl()}/transaction/${reference}/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Token ${token}`
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : "Campay status request failed";
    throw new Error(msg);
  }
  return data as CampayStatusResponse;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!jwt) return jsonResponse({ error: "Missing bearer token" }, 401);

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userRes.user) return jsonResponse({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);

    const action = typeof body.action === "string" ? body.action : "";
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!action || !orderId) return jsonResponse({ error: "action and orderId are required" }, 400);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id,buyer_id,quantity,price_xaf,payment_method,payment_status,payment_reference,payment_external_reference,payment_phone_e164")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) return jsonResponse({ error: orderErr.message }, 400);
    if (!order) return jsonResponse({ error: "Order not found" }, 404);
    if (order.buyer_id !== userRes.user.id) return jsonResponse({ error: "Forbidden" }, 403);

    const orderRow = order as unknown as OrderRow;

    if (action === "initiate") {
      if (orderRow.payment_method !== "mtn_momo" && orderRow.payment_method !== "orange_money") {
        return jsonResponse({ error: "Select MTN MoMo or Orange Money before requesting payment" }, 400);
      }
      if (orderRow.payment_status === "paid") return jsonResponse({ ok: true, status: "paid" }, 200);
      if (orderRow.payment_status === "pending" && orderRow.payment_reference) {
        return jsonResponse({ ok: true, status: "pending", reference: orderRow.payment_reference }, 200);
      }

      const suppliedPhone = typeof body.phone === "string" && body.phone.trim().length ? body.phone.trim() : null;
      const fallbackPhone = userRes.user.phone || orderRow.payment_phone_e164 || "";
      const phoneE164 = normalizePhoneE164(suppliedPhone ?? fallbackPhone);
      const token = await getCampayToken();
      const externalReference = orderRow.payment_external_reference || orderRow.id;
      const collect = await callCampayCollect(token, {
        amount: amountForOrder(orderRow),
        currency: "XAF",
        from: phoneForCampay(phoneE164),
        description: `AgriMarket order ${orderRow.id.slice(0, 8)}`,
        external_reference: externalReference
      });

      if (!collect.reference) return jsonResponse({ error: collect.message || "Campay did not return a reference" }, 502);

      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          payment_provider: "campay",
          payment_status: "pending",
          payment_reference: collect.reference,
          payment_external_reference: externalReference,
          payment_phone_e164: phoneE164,
          payment_error: null,
          payment_requested_at: new Date().toISOString()
        })
        .eq("id", orderRow.id);

      if (updateErr) return jsonResponse({ error: updateErr.message }, 400);

      return jsonResponse(
        {
          ok: true,
          status: "pending",
          reference: collect.reference,
          ussdCode: collect.ussd_code ?? null,
          operator: collect.operator ?? null,
          phone: phoneE164
        },
        200
      );
    }

    if (action === "sync") {
      if (!orderRow.payment_reference) return jsonResponse({ error: "No payment reference found for this order" }, 400);

      const token = await getCampayToken();
      const statusRes = await callCampayStatus(token, orderRow.payment_reference);
      const paymentStatus = mapCampayStatus(statusRes.status);

      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          payment_provider: "campay",
          payment_status: paymentStatus,
          payment_error: paymentStatus === "failed" ? statusRes.reason || statusRes.message || "Payment failed" : null,
          payment_completed_at: paymentStatus === "paid" ? new Date().toISOString() : null
        })
        .eq("id", orderRow.id);

      if (updateErr) return jsonResponse({ error: updateErr.message }, 400);

      return jsonResponse(
        {
          ok: true,
          status: paymentStatus,
          providerStatus: statusRes.status ?? null,
          reference: statusRes.reference ?? orderRow.payment_reference,
          operatorReference: statusRes.operator_reference ?? null,
          reason: statusRes.reason ?? null
        },
        200
      );
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
