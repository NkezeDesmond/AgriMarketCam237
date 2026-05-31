import { supabase } from "./supabase";
import type { Database, ListingStatus, OrderStatus, UserRole } from "../types/database";

export type ProfileAdmin = Database["public"]["Tables"]["profiles"]["Row"];
export type ListingAdmin = Database["public"]["Tables"]["listings"]["Row"];
export type OrderAdmin = Database["public"]["Tables"]["orders"]["Row"];
export type ReviewAdmin = Database["public"]["Tables"]["reviews"]["Row"];

export type AdminKpis = Database["public"]["Functions"]["admin_get_kpis"]["Returns"][number];

export async function fetchProfilesAdmin(input: { search?: string; limit?: number }): Promise<ProfileAdmin[]> {
  const limit = input.limit ?? 100;
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);

  const q = input.search?.trim();
  if (q) {
    query = query.or(`phone_e164.ilike.%${q}%,display_name.ilike.%${q}%,region.ilike.%${q}%,commune.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateProfileAdmin(
  id: string,
  patch: Partial<Pick<ProfileAdmin, "verified" | "suspended" | "role" | "display_name" | "region" | "commune">>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function fetchListingsAdmin(input: { status?: ListingStatus; limit?: number }): Promise<ListingAdmin[]> {
  const limit = input.limit ?? 100;
  let query = supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(limit);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateListingStatusAdmin(id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function fetchOrdersAdmin(input: { status?: OrderStatus; limit?: number }): Promise<OrderAdmin[]> {
  const limit = input.limit ?? 100;
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function transitionOrderStatusAdmin(input: { orderId: string; status: OrderStatus; note?: string | null }): Promise<void> {
  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: input.orderId,
    p_next_status: input.status,
    p_note: input.note ?? null
  });
  if (error) throw error;
}

export async function fetchReviewsAdmin(input: { search?: string; limit?: number }): Promise<ReviewAdmin[]> {
  const limit = input.limit ?? 100;
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(limit);
  const q = input.search?.trim();
  if (q) {
    query = query.or(`comment.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteReviewAdmin(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAdminKpis(input?: { from?: string | null; to?: string | null }): Promise<AdminKpis> {
  const { data, error } = await supabase.rpc("admin_get_kpis", {
    p_from: input?.from ?? null,
    p_to: input?.to ?? null
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) {
    return {
      total_users: 0,
      onboarded_users: 0,
      verified_users: 0,
      suspended_users: 0,
      total_listings: 0,
      active_listings: 0,
      hidden_listings: 0,
      total_orders: 0,
      disputed_orders: 0,
      completed_orders: 0,
      completed_gmv_xaf: 0
    };
  }
  return row;
}

export async function updateUserRoleSelf(role: Exclude<UserRole, "admin">): Promise<void> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user = auth.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
  if (error) throw error;
}
