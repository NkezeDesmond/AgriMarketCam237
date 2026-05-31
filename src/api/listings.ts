import { supabase } from "./supabase";
import type { Database } from "../types/database";
import { cacheActiveListings, findCachedListingById, getActiveListingsCache } from "../lib/offline/db";

export type Listing = Database["public"]["Tables"]["listings"]["Row"];

export type ListingsFilter = {
  cropType?: string;
  region?: string;
  priceMaxXaf?: number;
  search?: string;
};

function applyFilter(listings: Listing[], filter: ListingsFilter): Listing[] {
  return listings.filter((l) => {
    if (filter.cropType && !l.crop_type.toLowerCase().includes(filter.cropType.toLowerCase())) return false;
    if (filter.region && l.region !== filter.region) return false;
    if (typeof filter.priceMaxXaf === "number" && l.price_xaf > filter.priceMaxXaf) return false;
    if (filter.search) {
      const hay = `${l.title} ${l.description ?? ""} ${l.crop_type}`.toLowerCase();
      if (!hay.includes(filter.search.toLowerCase())) return false;
    }
    return true;
  });
}

export async function fetchListings(filter: ListingsFilter): Promise<Listing[]> {
  if (!navigator.onLine) {
    const cached = await getActiveListingsCache();
    return cached ? applyFilter(cached, filter) : [];
  }

  let query = supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });

  if (filter.cropType) query = query.ilike("crop_type", `%${filter.cropType}%`);
  if (filter.region) query = query.eq("region", filter.region);
  if (typeof filter.priceMaxXaf === "number") query = query.lte("price_xaf", filter.priceMaxXaf);
  if (filter.search) query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  const listings = data ?? [];
  await cacheActiveListings(listings);
  return listings;
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!navigator.onLine) return findCachedListingById(id);

  const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase.from("listings").select("*").eq("farmer_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateMyListingStatus(listingId: string, status: Listing["status"]): Promise<void> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}
