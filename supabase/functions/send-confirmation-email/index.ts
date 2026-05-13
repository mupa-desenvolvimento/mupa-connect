import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, loginUrl } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const emailResponse = await resend.emails.send({
      from: "Mupa <onboarding@resend.dev>", // O usuário deve configurar o domínio no Resend depois
      to: [email],
      subject: "Confirmação de Cadastro - Mupa",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Mupa</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f7f9;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            .header {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .content h2 {
              color: #1e293b;
              margin-top: 0;
              font-size: 22px;
            }
            .content p {
              color: #64748b;
              font-size: 16px;
              margin-bottom: 30px;
            }
            .button-container {
              margin: 35px 0;
            }
            .button {
              background-color: #3b82f6;
              color: white !important;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              transition: background-color 0.3s ease;
              display: inline-block;
            }
            .footer {
              background-color: #f8fafc;
              padding: 25px;
              text-align: center;
              font-size: 13px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
            }
            .logo-text {
              font-weight: 800;
              font-size: 24px;
              color: white;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-text">MUPA</div>
              <h1>Bem-vindo!</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Estamos muito felizes em ter você conosco. Seu cadastro foi realizado com sucesso em nossa plataforma.</p>
              <p>Para começar a explorar todos os recursos, clique no botão abaixo para acessar sua conta.</p>
              <div class="button-container">
                <a href="${loginUrl || "https://midias.mupa.app/login"}" class="button">Acessar minha conta</a>
              </div>
              <p style="font-size: 14px; color: #94a3b8;">Se você não realizou este cadastro, por favor ignore este e-mail.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Mupa. Todos os direitos reservados.<br>
              Tecnologia para varejo inteligente.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
