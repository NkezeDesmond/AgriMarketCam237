import { supabase } from "./supabase";
import type { Database, OrderStatus, PaymentMethod } from "../types/database";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type ListingMini = Pick<Database["public"]["Tables"]["listings"]["Row"], "title" | "crop_type" | "unit" | "price_xaf">;
export type OrderWithListing = Order & { listings: ListingMini | null };
export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];

export async function fetchMyOrders(userId: string): Promise<OrderWithListing[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, listings(title,crop_type,unit,price_xaf)")
    .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderWithListing[];
}

export async function placeOrder(input: {
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  price_xaf: number;
  payment_method?: PaymentMethod | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      listing_id: input.listing_id,
      buyer_id: input.buyer_id,
      farmer_id: input.farmer_id,
      quantity: input.quantity,
      price_xaf: input.price_xaf,
      status: "pending",
      payment_method: input.payment_method ?? null,
      payment_status: "unpaid"
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, note: string | null = null): Promise<void> {
  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: orderId,
    p_next_status: status,
    p_note: note
  });
  if (error) throw error;
}

export async function updateOrderPaymentMethod(orderId: string, method: PaymentMethod): Promise<void> {
  const { error } = await supabase.from("orders").update({ payment_method: method }).eq("id", orderId);
  if (error) throw error;
}

export async function fetchOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const { data, error } = await supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
