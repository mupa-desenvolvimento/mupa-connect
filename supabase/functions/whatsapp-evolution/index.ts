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

export function normalizeErrorDetail(value: unknown): string {
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

export function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
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
    const { action, instanceName, phone, message, companyId, description, recipients, templateId, groupId, variables } = body as any;

    // Helper: replace {variables} in template text
    const renderTemplate = (text: string, vars: Record<string, string> = {}) => {
      return String(text || "").replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
    };

    // Helper: send a single message via Evolution (v2 with v1 fallback)
    const sendOne = async (instance: string, normalizedPhone: string, text: string) => {
      try {
        return await evo(`/message/sendText/${instance}`, "POST", {
          number: normalizedPhone,
          text,
        });
      } catch (firstErr: any) {
        return await evo(`/message/sendText/${instance}`, "POST", {
          number: normalizedPhone,
          options: { delay: 1200, presence: "composing", linkPreview: false },
          textMessage: { text },
        });
      }
    };

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
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
          return json({ error: "Telefone inválido. Informe o número com DDI e DDD, usando apenas números." }, 400);
        }
        let data: any;
        let status = "sent";
        let errorMsg: string | null = null;
        try {
          // Try v2 format first ({ number, text }), then fall back to v1 ({ textMessage: { text } })
          try {
            data = await evo(`/message/sendText/${instanceName}`, "POST", {
              number: normalizedPhone,
              text: message,
            });
          } catch (firstErr: any) {
            console.log("sendText v2 failed, trying v1 format:", firstErr.message);
            data = await evo(`/message/sendText/${instanceName}`, "POST", {
              number: normalizedPhone,
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
          recipient_phone: normalizedPhone,
          message,
          status,
          error_message: errorMsg,
        });
        if (errorMsg) return json({ error: errorMsg }, 400);
        return json(data);
      }
      case "sendBulk": {
        if (!instanceName || !message) return json({ error: "instanceName and message required" }, 400);

        // Resolve recipient phones: from `recipients` (array of phones) and/or `groupId`
        const phones: string[] = [];
        if (Array.isArray(recipients)) {
          for (const p of recipients) {
            const n = normalizePhone(p);
            if (n.length >= 8 && n.length <= 15) phones.push(n);
          }
        }
        if (groupId) {
          const { data: members } = await admin
            .from("whatsapp_contact_group_members")
            .select("recipient_id, whatsapp_recipients(phone, is_active)")
            .eq("group_id", groupId);
          for (const m of members || []) {
            const rec: any = (m as any).whatsapp_recipients;
            if (rec?.is_active) {
              const n = normalizePhone(rec.phone);
              if (n.length >= 8 && n.length <= 15 && !phones.includes(n)) phones.push(n);
            }
          }
        }

        if (phones.length === 0) return json({ error: "Nenhum destinatário válido" }, 400);

        // Render template variables (server side too, for safety)
        const finalText = renderTemplate(message, variables || {});

        // Look up instance id once
        const { data: inst } = await admin.from("whatsapp_instances")
          .select("id").eq("instance_key", instanceName).maybeSingle();

        const errors: Array<{ phone: string; error: string }> = [];
        let success = 0;

        for (const p of phones) {
          try {
            await sendOne(instanceName, p, finalText);
            success++;
            await admin.from("whatsapp_logs").insert({
              instance_id: inst?.id || null,
              recipient_phone: p,
              message: finalText,
              status: "sent",
            });
            // Small throttle to avoid spam-blocks
            await new Promise((r) => setTimeout(r, 400));
          } catch (e: any) {
            errors.push({ phone: p, error: e.message });
            await admin.from("whatsapp_logs").insert({
              instance_id: inst?.id || null,
              recipient_phone: p,
              message: finalText,
              status: "error",
              error_message: e.message,
            });
          }
        }

        // Persist send history
        const overallStatus = success === phones.length ? "sent" : success === 0 ? "failed" : "partial";
        await admin.from("whatsapp_send_history").insert({
          instance_id: inst?.id || null,
          template_id: templateId || null,
          group_id: groupId || null,
          message: finalText,
          recipient_phones: phones,
          total_recipients: phones.length,
          success_count: success,
          failure_count: errors.length,
          status: overallStatus,
          error_details: errors.length ? errors : null,
          sent_by: userId,
        });

        return json({ status: overallStatus, total: phones.length, success, failed: errors.length, errors });
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});
