import { Resend } from "https://esm.sh/resend@3.2.0";

Deno.test("Send test email", async () => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.error("ERRO: RESEND_API_KEY não encontrada nos env vars.");
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(resendApiKey);
  console.log("Starting test email send to antunes@mupa.app...");
  
  const fromEmail = "Mupa <contato@midias.mupa.app>";
  const toEmail = "antunes@mupa.app";
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: "E-mail de Teste - Mupa",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Teste de Envio</h2>
          <p>Este é um e-mail de teste disparado manualmente para validar a configuração do Resend.</p>
          <hr />
          <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error Detail:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully!", data);
  } catch (err) {
    console.error("Caught error during test:", err);
    throw err;
  }
});
