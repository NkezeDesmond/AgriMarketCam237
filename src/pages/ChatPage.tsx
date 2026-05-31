import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../api/supabase";
import {
  fetchMessages,
  fetchMyConversations,
  fetchRecentMessages,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  type Conversation,
  type Message
} from "../api/chat";
import { fetchProfilesByIds } from "../api/profiles";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { enqueueAction } from "../lib/offline/db";
import { cn } from "../lib/cn";
import { debugEvent } from "../lib/debug";
import { CHAT_HERO_IMAGE, CHAT_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore, type Profile } from "../store/authStore";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";

export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState<string>("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const otherUserId = params.get("to");

  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id ?? "none"],
    queryFn: () => fetchMyConversations(user!.id),
    enabled: Boolean(user?.id)
  });

  useEffect(() => {
    if (!user?.id) return;
    // #region debug-point A:chat-conversations-query
    debugEvent({
      sessionId: "chat-page-broken",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "src/pages/ChatPage.tsx:conversationsQuery",
      msg: "[DEBUG] conversationsQuery state",
      data: {
        status: conversationsQuery.status,
        isLoading: conversationsQuery.isLoading,
        isError: conversationsQuery.isError,
        count: (conversationsQuery.data ?? []).length,
        error: conversationsQuery.isError ? (conversationsQuery.error as Error).message : null
      }
    });
    // #endregion
  }, [conversationsQuery.isError, conversationsQuery.isLoading, conversationsQuery.status, (conversationsQuery.data ?? []).length, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (!otherUserId) return;
    if (otherUserId === user.id) {
      setActiveConversation(null);
      setConversationError("You cannot start a chat with yourself. Open a listing from another user and message the seller.");
      return;
    }
    // #region debug-point A:chat-deeplink-start
    debugEvent({
      sessionId: "chat-page-broken",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "src/pages/ChatPage.tsx:deeplink",
      msg: "[DEBUG] Chat deeplink detected",
      data: { userId: user.id, otherUserId }
    });
    // #endregion
    void (async () => {
      const conv = await getOrCreateConversation(user.id, otherUserId);
      setActiveConversation(conv);
      setConversationError(null);
      await qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    })().catch((e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as any).message)
            : String(e);
      setConversationError(msg);
      // #region debug-point A:chat-deeplink-error
      debugEvent({
        sessionId: "chat-page-broken",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "src/pages/ChatPage.tsx:deeplink",
        msg: "[DEBUG] Deeplink getOrCreateConversation failed",
        data: { message: msg }
      });
      // #endregion
      throw e;
    });
  }, [otherUserId, qc, user]);

  const messagesQuery = useQuery({
    queryKey: ["messages", activeConversation?.id ?? "none"],
    queryFn: () => fetchMessages(activeConversation!.id),
    enabled: Boolean(activeConversation?.id)
  });

  useEffect(() => {
    if (!user) return;
    if (!activeConversation) return;
    void markConversationRead(activeConversation.id, user.id).catch(() => {});
  }, [activeConversation?.id, user]);

  useEffect(() => {
    if (!listRef.current) return;
    const len = (messagesQuery.data ?? []).length;
    if (!len) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight });
  }, [activeConversation?.id, (messagesQuery.data ?? []).length]);

  useEffect(() => {
    if (!activeConversation) return;
    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversation.id}` },
        (payload) => {
          const msg = payload.new as Message;
          qc.setQueryData<Message[]>(["messages", activeConversation.id], (prev) => (prev ? [...prev, msg] : [msg]));
          if (user && msg.recipient_id === user.id) {
            void markConversationRead(activeConversation.id, user.id).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeConversation, qc]);

  const activeOther = useMemo(() => {
    if (!user || !activeConversation) return null;
    return activeConversation.participant_low === user.id ? activeConversation.participant_high : activeConversation.participant_low;
  }, [activeConversation, user]);

  const list = conversationsQuery.data ?? [];

  const otherIds = useMemo(() => {
    if (!user) return [];
    const ids = list.map((c) => (c.participant_low === user.id ? c.participant_high : c.participant_low));
    return Array.from(new Set(ids));
  }, [list, user]);

  const profilesQuery = useQuery({
    queryKey: ["profiles-by-ids", otherIds.join(",")],
    queryFn: () => fetchProfilesByIds(otherIds),
    enabled: otherIds.length > 0
  });

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of profilesQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [profilesQuery.data]);

  const recentMessagesQuery = useQuery({
    queryKey: ["recent-messages", user?.id ?? "none", list.map((c) => c.id).join(",")],
    queryFn: () => fetchRecentMessages(list.map((c) => c.id)),
    enabled: Boolean(user?.id) && list.length > 0
  });

  const conversationMeta = useMemo(() => {
    const lastByConv = new Map<string, Message>();
    const unreadByConv = new Map<string, number>();

    for (const m of recentMessagesQuery.data ?? []) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      if (user && m.recipient_id === user.id && !m.read_at) {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      }
    }

    const meta = list.map((c) => {
      const other = user ? (c.participant_low === user.id ? c.participant_high : c.participant_low) : "user";
      const p = profileById.get(other) ?? null;
      const name = (p?.display_name ?? "").trim() || `User ${other.slice(0, 6)}`;
      const last = lastByConv.get(c.id) ?? null;
      const unread = unreadByConv.get(c.id) ?? 0;
      const sortAt = last?.created_at ?? c.created_at;
      return { conversation: c, otherId: other, name, last, unread, sortAt };
    });

    meta.sort((a, b) => String(b.sortAt).localeCompare(String(a.sortAt)));
    return meta;
  }, [list, profileById, recentMessagesQuery.data, user]);

  const visibleConversations = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return conversationMeta;
    return conversationMeta.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversationMeta, conversationSearch]);

  const activeOtherName = useMemo(() => {
    if (!activeOther) return null;
    const p = profileById.get(activeOther) ?? null;
    return (p?.display_name ?? "").trim() || `User ${activeOther.slice(0, 6)}`;
  }, [activeOther, profileById]);

  return (
    <Page width="xl">
      <PageHero
        imageUrl={CHAT_HERO_IMAGE}
        imageUrlSm={CHAT_HERO_IMAGE_SM}
        title="Chat"
        subtitle="Message buyers and sellers in real time. Unsent messages can be saved offline and synced later."
      />

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Chats</CardTitle>
            <CardDescription>Recent conversations</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-3 overflow-auto">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Search</div>
              <Input value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Search chats" />
            </div>
            {conversationsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            {conversationsQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(conversationsQuery.error as Error).message}
              </div>
            ) : null}

            {visibleConversations.map((meta) => {
              const c = meta.conversation;
              const active = activeConversation?.id === c.id;
              const initial = meta.name.slice(0, 1).toUpperCase();
              const lastTime = meta.last ? new Date(meta.last.created_at).toLocaleDateString() : null;
              const lastPreview = meta.last ? meta.last.body : "Open conversation";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConversation(c)}
                  className={cn(
                    "w-full rounded-2xl border border-border bg-background px-3 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-accent/40 bg-accent/15 shadow-sm" : null
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-sm font-semibold shadow-sm">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{meta.name}</div>
                        {lastTime ? <div className="shrink-0 text-xs text-muted-foreground">{lastTime}</div> : null}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <div className="truncate text-xs text-muted-foreground">{lastPreview}</div>
                        {meta.unread ? (
                          <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                            {meta.unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {conversationsQuery.data && conversationsQuery.data.length === 0 ? (
              <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
                No conversations yet. Open a listing and message a seller.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>{activeConversation ? (activeOtherName ? `Conversation with ${activeOtherName}` : "Conversation") : "Select a chat to start."}</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[70vh] flex-col gap-3">
            {conversationError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{conversationError}</div>
            ) : null}
            {!activeConversation ? (
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                Select a conversation from the left.
              </div>
            ) : (
              <>
                <div ref={listRef} className="flex-1 space-y-2 overflow-auto rounded-2xl border border-border bg-background p-4">
                  {(messagesQuery.data ?? []).map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            mine ? "bg-foreground text-background" : "bg-muted text-foreground"
                          )}
                        >
                          {m.body}
                          <div className={cn("mt-1 text-[10px] opacity-70", mine ? "text-background/80" : "text-muted-foreground")}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messagesQuery.isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> : null}
                </div>

                {sendError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{sendError}</div>
                ) : null}
                {sendNotice ? <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{sendNotice}</div> : null}

                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!user || !activeConversation || !activeOther) return;
                    const body = text.trim();
                    if (!body.length) return;
                    setSending(true);
                    setSendError(null);
                    setSendNotice(null);

                    if (!online) {
                      const optimistic: Message = {
                        id: crypto.randomUUID(),
                        conversation_id: activeConversation.id,
                        sender_id: user.id,
                        recipient_id: activeOther,
                        body,
                        created_at: new Date().toISOString(),
                        read_at: null
                      };
                      qc.setQueryData<Message[]>(["messages", activeConversation.id], (prev) => (prev ? [...prev, optimistic] : [optimistic]));
                      void enqueueAction({
                        id: crypto.randomUUID(),
                        type: "send_message",
                        createdAt: Date.now(),
                        payload: {
                          conversation_id: activeConversation.id,
                          sender_id: user.id,
                          recipient_id: activeOther,
                          body
                        }
                      }).then(() => setSendNotice("Saved offline. It will sync automatically when you are online."));
                      setText("");
                      setSending(false);
                      return;
                    }

                    void sendMessage({
                      conversation_id: activeConversation.id,
                      sender_id: user.id,
                      recipient_id: activeOther,
                      body
                    })
                      .then(() => setText(""))
                      .catch((err: unknown) => setSendError(err instanceof Error ? err.message : "Failed to send"))
                      .finally(() => setSending(false));
                  }}
                >
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write a message"
                    disabled={sending}
                    className="min-h-[44px] flex-1 resize-none"
                    rows={2}
                  />
                  <Button type="submit" className="h-11" disabled={sending || !text.trim().length}>
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
