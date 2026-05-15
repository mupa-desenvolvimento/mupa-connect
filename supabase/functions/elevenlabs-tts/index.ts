import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedAutoVoiceId: string | null = null;

async function resolveVoiceId(
  elevenLabsApiKey: string,
  requestedVoiceId?: unknown
): Promise<string> {
  if (typeof requestedVoiceId === "string" && requestedVoiceId.trim().length > 0) {
    return requestedVoiceId.trim();
  }

  const envPtBr =
    Deno.env.get("ELEVENLABS_VOICE_ID_PT_BR") ||
    Deno.env.get("ELEVENLABS_VOICE_ID_PTBR") ||
    Deno.env.get("ELEVENLABS_VOICE_ID_PT");

  if (envPtBr && envPtBr.trim().length > 0) return envPtBr.trim();

  const envAny = Deno.env.get("ELEVENLABS_VOICE_ID");
  if (envAny && envAny.trim().length > 0) return envAny.trim();

  if (cachedAutoVoiceId) return cachedAutoVoiceId;

  try {
    const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) throw new Error(`voices_list_http_${resp.status}`);

    const payload = await resp.json();
    const voices: any[] = Array.isArray(payload?.voices) ? payload.voices : [];
    if (voices.length === 0) throw new Error("voices_list_empty");

    const scored = voices
      .map((v) => {
        const voiceId = String(v?.voice_id || "").trim();
        const name = String(v?.name || "");
        const description = String(v?.description || "");
        const labels = (v?.labels || {}) as Record<string, unknown>;
        const accent = String(labels?.accent || "");
        const language = String(labels?.language || labels?.lang || "");
        const locale = String(labels?.locale || (v as any)?.locale || "");
        const normalizedLocale = locale.toLowerCase().replaceAll("_", "-").trim();

        const haystack = `${name} ${description} ${accent} ${language}`.toLowerCase();

        let score = 0;
        const isPtBrLocale = normalizedLocale === "pt-br";
        if (isPtBrLocale) score += 1000;
        if (language.toLowerCase().startsWith("pt")) score += 100;
        if (haystack.includes("pt-br") || haystack.includes("pt_br")) score += 90;
        if (haystack.includes("brazil") || haystack.includes("brasil") || haystack.includes("brasile")) score += 80;
        if (haystack.includes("portugu")) score += 60;
        if (haystack.includes("brazilian")) score += 60;

        return { voiceId, score, isPtBrLocale };
      })
      .filter((x) => x.voiceId.length > 0)
      .sort((a, b) => b.score - a.score);

    const ptBrOnly = scored.filter((x) => x.isPtBrLocale);
    const best = (ptBrOnly.length > 0 ? ptBrOnly[0] : scored[0]) || null;
    cachedAutoVoiceId = (best?.voiceId || voices[0]?.voice_id || null) as string | null;
  } catch {
    cachedAutoVoiceId = null;
  }
  console.log("Auto Voice ID:", cachedAutoVoiceId);
  return "IKne3meq5aSn9XLyUdCD"
  //return cachedAutoVoiceId || "SAz9YHcvj6GT2YYXdXww";
}

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice_id } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const resolvedVoiceId = await resolveVoiceId(ELEVENLABS_API_KEY, voice_id);
    console.log("Resolved Voice ID:", resolvedVoiceId);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const textHash = await hashText(text);

    // Check cache first
    const { data: cached } = await supabase
      .from("tts_audio_cache")
      .select("audio_url")
      .eq("text_hash", textHash)
      .eq("voice_id", resolvedVoiceId)
      .maybeSingle();

    if (cached?.audio_url) {
      console.log("[TTS] Cache hit for:", text.substring(0, 50));
      // Update usage stats
      await supabase
        .from("tts_audio_cache")
        .update({ last_used_at: new Date().toISOString(), use_count: undefined })
        .eq("text_hash", textHash)
        .eq("voice_id", resolvedVoiceId);
      
      // Use RPC-less increment: fetch current, increment, update
      const { data: current } = await supabase
        .from("tts_audio_cache")
        .select("use_count")
        .eq("text_hash", textHash)
        .eq("voice_id", resolvedVoiceId)
        .single();
      
      if (current) {
        await supabase
          .from("tts_audio_cache")
          .update({ use_count: (current.use_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq("text_hash", textHash)
          .eq("voice_id", resolvedVoiceId);
      }

      return new Response(JSON.stringify({ audio_url: cached.audio_url, cached: true, voice_id: resolvedVoiceId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate TTS via ElevenLabs
    console.log("[TTS] Generating audio for:", text.substring(0, 50));
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("[TTS] ElevenLabs error:", ttsResponse.status, errText);
      throw new Error(`ElevenLabs API error: ${ttsResponse.status}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // Upload to R2 via the existing upload pipeline
    const r2AccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const r2AccessKey = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const r2SecretKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const r2Bucket = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");
    const r2PublicUrl = Deno.env.get("CLOUDFLARE_R2_PUBLIC_URL");

    if (!r2AccountId || !r2AccessKey || !r2SecretKey || !r2Bucket || !r2PublicUrl) {
      // R2 not configured, return audio as base64 without caching
      const fullBase64 = base64Encode(audioBuffer);
      
      return new Response(JSON.stringify({ audio_base64: fullBase64, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to R2 using S3-compatible API
    const fileName = `tts-cache/${textHash}.mp3`;
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
    
    // Use simple PUT with presigned-like approach
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "").substring(0, 15) + "Z";
    
    // Simple approach: use the AWS S3 compatible API with basic auth
    const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.18");
    const r2Client = new AwsClient({
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
    });

    const uploadUrl = `${r2Endpoint}/${r2Bucket}/${fileName}`;
    const uploadResponse = await r2Client.fetch(uploadUrl, {
      method: "PUT",
      body: audioBuffer,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });

    if (!uploadResponse.ok) {
      console.error("[TTS] R2 upload failed:", uploadResponse.status);
      throw new Error("Failed to upload audio to storage");
    }

    const audioUrl = `${r2PublicUrl}/${fileName}`;

    // Save to cache
    await supabase.from("tts_audio_cache").upsert({
      text_hash: textHash,
      text_content: text,
      voice_id: resolvedVoiceId,
      audio_url: audioUrl,
      use_count: 1,
      last_used_at: new Date().toISOString(),
    }, { onConflict: "text_hash,voice_id" });

    console.log("[TTS] Audio cached:", audioUrl);

    return new Response(JSON.stringify({ audio_url: audioUrl, cached: false, voice_id: resolvedVoiceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[TTS] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
