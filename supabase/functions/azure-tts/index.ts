import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const region = Deno.env.get("AZURE_SPEECH_REGION") || "brazilsouth";
const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

let cachedToken: { value: string; expiresAt: number } | null = null;
const ipBuckets = new Map<string, { windowStart: number; count: number }>();

function getClientIp(req: Request) {
  const xfwd = req.headers.get("x-forwarded-for");
  if (!xfwd) return "unknown";
  return xfwd.split(",")[0]?.trim() || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 60;
  const b = ipBuckets.get(ip);
  if (!b || now - b.windowStart >= windowMs) {
    ipBuckets.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

async function getToken() {
  const key = Deno.env.get("AZURE_SPEECH_KEY");
  if (!key) throw new Error("AZURE_SPEECH_KEY is not configured");

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Token request failed (${resp.status}): ${text}`);
  }
  const token = await resp.text();
  cachedToken = { value: token, expiresAt: now + 9 * 60_000 };
  return token;
}

function escapeXml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice : "pt-BR-FranciscaNeural";
    const outputFormat = typeof body?.format === "string"
      ? body.format
      : "audio-24khz-48kbitrate-mono-mp3";

    if (!text) throw new Error("text is required");
    if (text.length > 220) throw new Error("text too long");

    const token = await getToken();

    const ssml =
      `<speak version="1.0" xml:lang="pt-BR">` +
      `<voice xml:lang="pt-BR" name="${escapeXml(voice)}">` +
      `${escapeXml(text)}` +
      `</voice></speak>`;

    const ttsResp = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": outputFormat,
        "User-Agent": "mupa-connect",
      },
      body: ssml,
    });

    if (!ttsResp.ok) {
      const errText = await ttsResp.text().catch(() => "");
      return new Response(JSON.stringify({ error: `TTS failed (${ttsResp.status})`, details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBytes = new Uint8Array(await ttsResp.arrayBuffer());
    const contentType = outputFormat.includes("mp3") ? "audio/mpeg" : "audio/wav";

    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

