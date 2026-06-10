import { supabase } from "./supabase";

type CampayPaymentResponse = {
  ok: boolean;
  status: "pending" | "paid" | "failed";
  reference?: string | null;
  ussdCode?: string | null;
  operator?: string | null;
  phone?: string | null;
  reason?: string | null;
};

export async function requestCampayPayment(orderId: string, phone: string): Promise<CampayPaymentResponse> {
  const { data, error } = await supabase.functions.invoke<CampayPaymentResponse>("campay-payment", {
    body: { action: "initiate", orderId, phone }
  });

  if (error) {
    const msg = error.message || "Failed to request mobile money payment.";
    if (msg.toLowerCase().includes("failed to send a request to the edge function")) {
      throw new Error("Mobile money payment is not available yet. Deploy the Supabase Edge Function “campay-payment” and set the Campay secrets.");
    }
    throw new Error(msg);
  }

  if (!data) throw new Error("Failed to request mobile money payment.");
  return data;
}

export async function syncCampayPayment(orderId: string): Promise<CampayPaymentResponse> {
  const { data, error } = await supabase.functions.invoke<CampayPaymentResponse>("campay-payment", {
    body: { action: "sync", orderId }
  });

  if (error) {
    const msg = error.message || "Failed to refresh payment status.";
    if (msg.toLowerCase().includes("failed to send a request to the edge function")) {
      throw new Error("Payment status sync is not available yet. Deploy the Supabase Edge Function “campay-payment”.");
    }
    throw new Error(msg);
  }

  if (!data) throw new Error("Failed to refresh payment status.");
  return data;
}
