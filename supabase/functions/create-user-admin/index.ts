import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

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

    const { email, password, name, role, companyId, tenantId, loginUrl } = await req.json();

    if (!email || !password || !name) {
      throw new Error("Email, password and name are required");
    }

    // 1. Create User in Auth (Admin)
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Mark as confirmed to avoid standard email
      user_metadata: { full_name: name },
    });

    if (createError) throw createError;

    const user = userData.user;

    // 2. Create User Profile
    const { error: profileError } = await supabaseClient
      .from("user_profiles")
      .insert({
        id: user.id,
        company_id: companyId,
        tenant_id: tenantId,
        role: role,
      });

    if (profileError) throw profileError;

    // Send Email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    // IMPORTANTE: Configure seu domínio no painel do Resend para usar um e-mail próprio
    // Se o domínio midias.mupa.app estiver verificado no Resend, use: 'Mupa <contato@midias.mupa.app>'
    const fromEmail = "Mupa <onboarding@resend.dev>"; 

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Bem-vindo ao Mupa - Seus dados de acesso",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Mupa</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f9; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; color: white; }
            .logo-text { font-weight: 800; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .content { padding: 40px 30px; text-align: center; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .content p { color: #64748b; font-size: 16px; }
            .credentials { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: left; border: 1px solid #e2e8f0; }
            .credential-item { margin-bottom: 10px; font-size: 14px; }
            .credential-label { font-weight: 600; color: #475569; width: 60px; display: inline-block; }
            .button { background-color: #3b82f6; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 25px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-text">MUPA</div>
              <h1 style="margin:10px 0 0 0; font-size: 24px;">Bem-vindo à plataforma!</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Seu perfil de acesso foi criado com sucesso. Agora você pode gerenciar suas mídias e dispositivos.</p>
              
              <div class="credentials">
                <div class="credential-item"><span class="credential-label">E-mail:</span> <strong>${email}</strong></div>
                <div class="credential-item"><span class="credential-label">Senha:</span> <i>(A senha definida pelo administrador)</i></div>
              </div>

              <p>Clique no botão abaixo para acessar o painel:</p>
              <a href="${loginUrl || "https://midias.mupa.app/login"}" class="button">Acessar Painel</a>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Mupa. Tecnologia para varejo inteligente.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      // We don't throw here to avoid failing the whole process if only the email fails
    }

    return new Response(JSON.stringify({ success: true, user, email: emailData }), {
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
