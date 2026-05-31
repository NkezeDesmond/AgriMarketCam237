import { supabase } from "./supabase";
import type { Database } from "../types/database";
import { debugEvent } from "../lib/debug";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

async function assertBuyerFarmerPair(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", [userId, otherUserId]);
  if (error) throw error;
  const byId = new Map((data ?? []).map((p) => [p.id, p.role]));
  const a = byId.get(userId) ?? null;
  const b = byId.get(otherUserId) ?? null;
  const ok = (a === "buyer" && b === "farmer") || (a === "farmer" && b === "buyer");
  if (!ok) {
    throw new Error("Chat is only available between buyers and sellers.");
  }
}

export function normalizePair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation> {
  if (userId === otherUserId) {
    throw new Error("You cannot start a conversation with yourself.");
  }
  await assertBuyerFarmerPair(userId, otherUserId);
  const { low, high } = normalizePair(userId, otherUserId);
  // #region debug-point A:get-or-create-start
  debugEvent({
    sessionId: "chat-page-broken",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/chat.ts:getOrCreateConversation",
    msg: "[DEBUG] getOrCreateConversation start",
    data: { userId, otherUserId, low, high }
  });
  // #endregion

  const existing = await supabase
    .from("conversations")
    .select("*")
    .eq("participant_low", low)
    .eq("participant_high", high)
    .maybeSingle();
  // #region debug-point A:get-or-create-existing
  debugEvent({
    sessionId: "chat-page-broken",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/chat.ts:getOrCreateConversation",
    msg: "[DEBUG] getOrCreateConversation existing result",
    data: {
      ok: !existing.error,
      hasData: Boolean(existing.data),
      error: existing.error
        ? { message: existing.error.message, code: (existing.error as any).code, details: (existing.error as any).details, hint: (existing.error as any).hint }
        : null
    }
  });
  // #endregion
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await supabase
    .from("conversations")
    .insert({ participant_low: low, participant_high: high })
    .select("*")
    .single();
  // #region debug-point A:get-or-create-created
  debugEvent({
    sessionId: "chat-page-broken",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/chat.ts:getOrCreateConversation",
    msg: "[DEBUG] getOrCreateConversation create result",
    data: {
      ok: !created.error,
      hasData: Boolean(created.data),
      error: created.error
        ? {
            message: created.error.message,
            code: (created.error as any).code,
            details: (created.error as any).details,
            hint: (created.error as any).hint,
            status: (created.error as any).status
          }
        : null
    }
  });
  // #endregion
  if (created.error) throw created.error;
  return created.data;
}

export async function fetchMyConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_low.eq.${userId},participant_high.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecentMessages(conversationIds: string[]): Promise<Message[]> {
  const unique = Array.from(new Set(conversationIds)).filter(Boolean);
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", unique)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(input: { conversation_id: string; sender_id: string; recipient_id: string; body: string }): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversation_id,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    body: input.body
  });
  if (error) throw error;

  const notify = await supabase.functions.invoke("push-message", {
    body: { senderId: input.sender_id, recipientId: input.recipient_id, body: input.body }
  });
  if (notify.error) {
    debugEvent({
      sessionId: "push-message",
      runId: "send",
      hypothesisId: "A",
      location: "src/api/chat.ts:sendMessage",
      msg: "push-message invoke failed",
      data: { message: notify.error.message }
    });
  }
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
