import { supabase } from "./supabase";
import type { Database } from "../types/database";

export type MarketPrice = Database["public"]["Tables"]["market_prices"]["Row"];

export async function fetchMarketPrices(input: { crop_type?: string; region?: string; limit?: number }): Promise<MarketPrice[]> {
  const limit = input.limit ?? 200;
  let query = supabase.from("market_prices").select("*").order("captured_at", { ascending: true }).limit(limit);

  if (input.crop_type) query = query.eq("crop_type", input.crop_type);
  if (input.region) query = query.eq("region", input.region);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createMarketPrice(input: {
  crop_type: string;
  region: string;
  price_xaf: number;
  captured_at: string;
  source?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("market_prices")
    .insert({
      crop_type: input.crop_type,
      region: input.region,
      price_xaf: input.price_xaf,
      captured_at: input.captured_at,
      source: input.source ?? null
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteMarketPrice(id: string): Promise<void> {
  const { error } = await supabase.from("market_prices").delete().eq("id", id);
  if (error) throw error;
}

