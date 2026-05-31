import { supabase } from "./supabase";
import type { Database } from "../types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", unique);
  if (error) throw error;
  return data ?? [];
}

