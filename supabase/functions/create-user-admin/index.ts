import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requester = authData.user;
    const { data: requesterRole, error: requesterRoleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .in("role", ["admin_global", "admin"])
      .maybeSingle();

    if (requesterRoleError) throw requesterRoleError;
    if (!requesterRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, role, companyId, tenantId, loginUrl } = await req.json();

    if (!email || !name || !role || !companyId || !tenantId) {
      throw new Error("Email, name, role, companyId and tenantId are required");
    }

    let user = null as any;
    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: name },
        redirectTo: loginUrl,
      },
    );

    if (inviteError) throw inviteError;
    user = inviteData?.user;
    if (!user?.id) throw new Error("Falha ao convidar usuário");

    if (password && typeof password === "string" && password.length >= 6) {
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(user.id, {
        password,
      });
      if (updateError) throw updateError;
    }

    const { error: profileError } = await supabaseClient
      .from("user_profiles")
      .upsert(
        {
          id: user.id,
          company_id: companyId,
          tenant_id: tenantId,
          role: role,
        },
        { onConflict: "id" },
      );

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true, user, email: { provider: "supabase_invite" } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
