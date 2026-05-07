import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVOLUTION_API_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

class EvolutionApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EvolutionApiError";
    this.status = status;
  }
}

function normalizeErrorDetail(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizeErrorDetail).filter(Boolean).join("; ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const jid = normalizeErrorDetail(record.jid);
    if (record.exists === false && jid) return `Número não encontrado no WhatsApp: ${jid}`;
    const nested = normalizeErrorDetail(record.message || record.error || record.response || record.raw);
    return nested || JSON.stringify(record);
  }
  return String(value);
}

async function evo(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const detail = normalizeErrorDetail(data?.response?.message || data?.message || data?.error || data) || `Evolution API error ${res.status}`;
    console.error("Evolution API error", res.status, path, text);
    throw new EvolutionApiError(detail, res.status);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: must be admin_global
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin_global" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action, instanceName, phone, message, companyId, description } = body as any;

    switch (action) {
      case "createInstance": {
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const data = await evo("/instance/create", "POST", {
          instanceName,
          token: instanceName,
          qrcode: true,
        });
        const { error: insErr } = await admin.from("whatsapp_instances").insert({
          name: instanceName,
          instance_key: instanceName,
          company_id: companyId || null,
          status: "connecting",
        });
        if (insErr) console.error("DB insert error:", insErr);
        return json(data);
      }
      case "getQRCode": {
        const data = await evo(`/instance/connect/${instanceName}`, "GET");
        const base64 = data?.base64 || data?.qrcode?.base64 || data?.code || null;
        return json({ ...data, base64 });
      }
      case "connectionState": {
        const data = await evo(`/instance/connectionState/${instanceName}`, "GET");
        const state = data?.instance?.state || data?.state;
        if (state) {
          await admin.from("whatsapp_instances")
            .update({
              status: state === "open" ? "connected" : state,
              last_connection_at: state === "open" ? new Date().toISOString() : undefined,
            })
            .eq("instance_key", instanceName);
        }
        return json({ state, raw: data });
      }
      case "logout": {
        const data = await evo(`/instance/logout/${instanceName}`, "DELETE");
        await admin.from("whatsapp_instances").update({ status: "disconnected" }).eq("instance_key", instanceName);
        return json(data);
      }
      case "deleteInstance": {
        const data = await evo(`/instance/delete/${instanceName}`, "DELETE");
        await admin.from("whatsapp_instances").delete().eq("instance_key", instanceName);
        return json(data);
      }
      case "sendMessage": {
        if (!instanceName || !phone || !message) return json({ error: "instanceName, phone, message required" }, 400);
        let data: any;
        let status = "sent";
        let errorMsg: string | null = null;
        try {
          // Try v2 format first ({ number, text }), then fall back to v1 ({ textMessage: { text } })
          try {
            data = await evo(`/message/sendText/${instanceName}`, "POST", {
              number: phone,
              text: message,
            });
          } catch (firstErr: any) {
            console.log("sendText v2 failed, trying v1 format:", firstErr.message);
            data = await evo(`/message/sendText/${instanceName}`, "POST", {
              number: phone,
              options: { delay: 1200, presence: "composing", linkPreview: false },
              textMessage: { text: message },
            });
          }
        } catch (e: any) {
          status = "error";
          errorMsg = e.message;
        }
        const { data: inst } = await admin.from("whatsapp_instances")
          .select("id").eq("instance_key", instanceName).maybeSingle();
        await admin.from("whatsapp_logs").insert({
          instance_id: inst?.id || null,
          recipient_phone: phone,
          message,
          status,
          error_message: errorMsg,
        });
        if (errorMsg) return json({ error: errorMsg }, 400);
        return json(data);
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});
