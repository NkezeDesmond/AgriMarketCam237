import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type PricePoint = { captured_at: string; price_xaf: number };

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
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
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
  if (!apiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);

  const crop_type = typeof body.crop_type === "string" ? body.crop_type : "";
  const region = typeof body.region === "string" ? body.region : "";
  const history: PricePoint[] = Array.isArray(body.history) ? body.history : [];

  if (!crop_type || !region || history.length < 3) {
    return jsonResponse({ error: "crop_type, region, and history (>=3 points) are required" }, 400);
  }

  const prompt = [
    "You are an agricultural market analyst for Cameroon.",
    "Given historical market prices, forecast the next 12 weeks.",
    "Return ONLY strict JSON with this shape:",
    `{ "forecast": [{ "week": "YYYY-Www", "price_xaf": number }], "insights": string[] }`,
    "Do not include markdown, prose, or code fences.",
    `Crop: ${crop_type}`,
    `Region: ${region}`,
    `History: ${JSON.stringify(history).slice(0, 8000)}`
  ].join("\n");

  try {
    const raw = await callGemini("gemini-1.5-flash", apiKey, prompt);
    const parsed = JSON.parse(raw);
    return jsonResponse(parsed, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

