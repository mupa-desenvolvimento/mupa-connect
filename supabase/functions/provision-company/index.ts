import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProvisionCompanyRequest = {
  tenant: {
    name: string;
    slug?: string;
  };
  company: {
    name: string;
    cnpj?: string | null;
    slug?: string;
  };
  adminUser: {
    email: string;
    password: string;
    full_name?: string;
  };
};

function slugify(input: string) {
  const base = (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "tenant";
}

function buildSchemaName(slug: string) {
  const normalized = slug.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_");
  const trimmed = normalized.slice(0, 45);
  return `tenant_${trimmed}`;
}

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  table: "tenants" | "companies",
  requested: string,
) {
  let candidate = requested;
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    const suffix = crypto.randomUUID().slice(0, 6);
    candidate = `${requested}-${suffix}`;
  }

  return `${requested}-${crypto.randomUUID().slice(0, 10)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const requester = authData.user;

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .eq("role", "admin_global")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as ProvisionCompanyRequest;

    const tenantName = payload?.tenant?.name?.trim();
    const companyName = payload?.company?.name?.trim();
    const adminEmail = payload?.adminUser?.email?.trim()?.toLowerCase();
    const adminPassword = payload?.adminUser?.password;
    const adminFullName = payload?.adminUser?.full_name?.trim() || null;
    const companyCnpj = payload?.company?.cnpj?.trim?.() || payload?.company?.cnpj || null;

    if (!tenantName || !companyName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestedTenantSlug = slugify(payload?.tenant?.slug || tenantName);
    const tenantSlug = await ensureUniqueSlug(supabaseAdmin, "tenants", requestedTenantSlug);
    const schemaName = buildSchemaName(tenantSlug);

    const requestedCompanySlug = slugify(payload?.company?.slug || companyName);
    const companySlug = await ensureUniqueSlug(supabaseAdmin, "companies", requestedCompanySlug);

    let createdUserId: string | null = null;
    let createdCompanyId: string | null = null;
    let createdTenantId: string | null = null;

    try {
      const { data: tenantRow, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({
          name: tenantName,
          slug: tenantSlug,
          schema_name: schemaName,
          is_active: true,
        })
        .select("id, name, slug")
        .single();

      if (tenantError) throw tenantError;
      createdTenantId = tenantRow.id;

      const { data: companyRow, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({
          name: companyName,
          cnpj: companyCnpj,
          tenant_id: createdTenantId,
          is_active: true,
          slug: companySlug,
        })
        .select("id, name, tenant_id, slug")
        .single();

      if (companyError) throw companyError;
      createdCompanyId = companyRow.id;

      const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin
        .createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: adminFullName ? { full_name: adminFullName } : undefined,
        });

      if (createUserError) throw createUserError;
      if (!createdUser?.user?.id) throw new Error("Falha ao criar usuário admin");
      createdUserId = createdUser.user.id;

      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .upsert(
          {
            id: createdUserId,
            tenant_id: createdTenantId,
            company_id: createdCompanyId,
            role: "admin",
          },
          { onConflict: "id" },
        );
      if (profileError) throw profileError;

      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: createdUserId, role: "admin" });
      if (roleInsertError && roleInsertError.code !== "23505") throw roleInsertError;

      const { error: mappingError } = await supabaseAdmin
        .from("user_tenant_mappings")
        .insert({
          user_id: createdUserId,
          tenant_id: createdTenantId,
          is_tenant_admin: true,
        });
      if (mappingError && mappingError.code !== "23505") throw mappingError;

      return new Response(
        JSON.stringify({
          tenant: { id: createdTenantId, name: tenantName, slug: tenantSlug },
          company: { id: createdCompanyId, name: companyName, slug: companySlug },
          adminUser: { id: createdUserId, email: adminEmail },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      if (createdUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        } catch {
        }
      }
      if (createdCompanyId) {
        try {
          await supabaseAdmin.from("companies").delete().eq("id", createdCompanyId);
        } catch {
        }
      }
      if (createdTenantId) {
        try {
          await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
        } catch {
        }
      }
      throw err;
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

