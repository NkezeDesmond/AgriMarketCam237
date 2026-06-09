import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 900 }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  if (!apiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);

  const lang = body.lang === "fr" || body.lang === "en" || body.lang === "pcm" ? body.lang : "en";
  const question = typeof body.question === "string" ? body.question : "";
  const context = typeof body.context === "string" ? body.context : "";

  if (!question) return jsonResponse({ error: "question is required" }, 400);

  const languageInstruction =
    lang === "fr"
      ? "Respond in French."
      : lang === "pcm"
        ? "Respond in Cameroonian Pidgin English."
        : "Respond in English.";

  const prompt = [
    "You are an agricultural advisory assistant specialized in Cameroonian smallholder farming.",
    languageInstruction,
    "Be concise, practical, and safety-aware.",
    "If uncertain, ask 1-2 clarifying questions.",
    "Do not mention being an AI model.",
    context ? `Context: ${context}` : "",
    `Question: ${question}`
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const answer = await callGemini(model, apiKey, prompt);
    return jsonResponse({ answer }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
