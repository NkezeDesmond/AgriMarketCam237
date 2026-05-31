import { supabase } from "./supabase";

export type PricePoint = { captured_at: string; price_xaf: number };

export type PricePredictionResponse = {
  forecast: Array<{ week: string; price_xaf: number }>;
  insights: string[];
};

export async function predictPrices(input: {
  crop_type: string;
  region: string;
  history: PricePoint[];
}): Promise<PricePredictionResponse> {
  const { data, error } = await supabase.functions.invoke<PricePredictionResponse>("price-predict", {
    body: input
  });
  if (error) {
    const msg = error.message || "Failed to generate forecast.";
    if (msg.toLowerCase().includes("failed to send a request to the edge function")) {
      throw new Error("Price forecast is not available yet. Deploy the Supabase Edge Function “price-predict” and set GEMINI_API_KEY.");
    }
    throw new Error(msg);
  }
  if (!data) throw new Error("Failed to generate forecast.");
  return data;
}

export async function advisoryChat(input: { lang: "en" | "fr" | "pcm"; question: string; context?: string }): Promise<string> {
  const traceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // #region debug-point A:advisory-auth-state
  supabase.auth
    .getSession()
    .then(({ data }) => {
      fetch("http://127.0.0.1:7778/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "advisory-chat-failing",
          runId: "pre-fix",
          hypothesisId: "A",
          traceId,
          location: "src/api/ai.ts:advisoryChat",
          msg: "[DEBUG] advisory-chat invoke (auth state)",
          data: {
            hasSession: Boolean(data.session),
            userIdTail: data.session?.user?.id ? data.session.user.id.slice(-6) : null,
            expiresAt: data.session?.expires_at ?? null,
            lang: input.lang,
            questionLen: input.question.length,
            hasContext: Boolean(input.context?.length)
          },
          ts: Date.now()
        })
      }).catch(() => {});
    })
    .catch(() => {});
  // #endregion

  const startedAt = Date.now();
  const { data, error } = await supabase.functions.invoke<{ answer: string }>("advisory-chat", {
    body: input
  });
  if (error) {
    // #region debug-point C:advisory-invoke-error
    (() => {
      const errAny = error as unknown as Record<string, unknown>;
      fetch("http://127.0.0.1:7778/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "advisory-chat-failing",
          runId: "pre-fix",
          hypothesisId: "C",
          traceId,
          location: "src/api/ai.ts:advisoryChat",
          msg: "[DEBUG] advisory-chat invoke error",
          data: {
            elapsedMs: Date.now() - startedAt,
            message: (errAny?.["message"] as string | undefined) ?? null,
            name: (errAny?.["name"] as string | undefined) ?? null,
            status: (errAny?.["status"] as number | undefined) ?? null,
            details: (errAny?.["details"] as unknown) ?? null,
            hint: (errAny?.["hint"] as unknown) ?? null,
            code: (errAny?.["code"] as unknown) ?? null
          },
          ts: Date.now()
        })
      }).catch(() => {});
    })();
    // #endregion

    const msg = error.message || "Failed to get advisory response.";
    const msgLower = msg.toLowerCase();
    const errAny = error as unknown as { status?: number; name?: string; message?: string };
    if (
      msgLower.includes("failed to send a request to the edge function") ||
      msgLower.includes("requested function was not found") ||
      msgLower.includes("not_found") ||
      errAny.status === 404
    ) {
      throw new Error("Farm advisory is not available yet. Deploy the Supabase Edge Function “advisory-chat” and set GEMINI_API_KEY.");
    }
    throw new Error(msg);
  }

  // #region debug-point B:advisory-invoke-success
  fetch("http://127.0.0.1:7778/event", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "advisory-chat-failing",
      runId: "pre-fix",
      hypothesisId: "B",
      traceId,
      location: "src/api/ai.ts:advisoryChat",
      msg: "[DEBUG] advisory-chat invoke success",
      data: { elapsedMs: Date.now() - startedAt, answerLen: data?.answer?.length ?? null },
      ts: Date.now()
    })
  }).catch(() => {});
  // #endregion
  if (!data) throw new Error("Failed to get advisory response.");
  return data.answer;
}
