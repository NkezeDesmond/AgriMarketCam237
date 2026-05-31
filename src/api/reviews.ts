import { supabase } from "./supabase";
import type { Database } from "../types/database";

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type RevieweeRatingSummary = Database["public"]["Views"]["reviewee_rating_summary"]["Row"];
export type ListingRatingSummary = Database["public"]["Views"]["listing_rating_summary"]["Row"];

export type ReviewWithReviewer = Review & {
  profiles: Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "avatar_url"> | null;
};

export async function fetchListingReviews(listingId: string): Promise<ReviewWithReviewer[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles!reviews_reviewer_id_fkey(display_name,avatar_url)")
    .eq("listing_id", listingId)
    .not("order_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithReviewer[];
}

export async function fetchListingRatingSummary(listingId: string): Promise<ListingRatingSummary | null> {
  const { data, error } = await supabase.from("listing_rating_summary").select("*").eq("listing_id", listingId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchRevieweeRatingSummary(revieweeId: string): Promise<RevieweeRatingSummary | null> {
  const { data, error } = await supabase.from("reviewee_rating_summary").select("*").eq("reviewee_id", revieweeId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchMyReviewsForOrders(input: { reviewerId: string; orderIds: string[] }): Promise<Pick<Review, "id" | "order_id">[]> {
  if (input.orderIds.length === 0) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("id, order_id")
    .eq("reviewer_id", input.reviewerId)
    .in("order_id", input.orderIds);
  if (error) throw error;
  return (data ?? []) as unknown as Pick<Review, "id" | "order_id">[];
}

export async function createReviewForOrder(input: { orderId: string; rating: number; comment: string | null }): Promise<string> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user = auth.user;
  if (!user) throw new Error("Not signed in");

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, listing_id, buyer_id, farmer_id, status")
    .eq("id", input.orderId)
    .single();
  if (orderErr) throw orderErr;
  if (!order) throw new Error("Order not found");

  const revieweeId = order.buyer_id === user.id ? order.farmer_id : order.buyer_id;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      order_id: order.id,
      listing_id: order.listing_id,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: input.rating,
      comment: input.comment
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

