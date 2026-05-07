import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/reflection@v0.1.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errors } = await req.json();

    if (!errors || !Array.isArray(errors)) {
      throw new Error('Invalid input: errors must be an array');
    }

    // Limit the data sent to AI to avoid context window issues and cost
    const sampleErrors = errors.slice(0, 100).map(e => ({
      product: e.product_name,
      ean: e.ean,
      store: e.store_name,
      device: e.device_name || e.device_serial,
      type: e.error_type,
      count: e.error_count,
      last: e.last_occurrence
    }));

    const prompt = `Analise os seguintes erros de consulta de produtos em uma plataforma de varejo:
    
    ${JSON.stringify(sampleErrors, null, 2)}
    
    Por favor, forneça:
    1. **Resumo Executivo**: Um parágrafo resumindo a situação geral.
    2. **Insights Críticos**: Identifique os produtos, lojas ou dispositivos com mais falhas.
    3. **Possíveis Causas**: Baseado nos tipos de erro e padrões (ex: erro 404 em várias lojas sugere erro no ERP).
    4. **Recomendações**: Ações preventivas que o suporte técnico ou o cliente devem tomar.

    Responda em Português do Brasil, formatado em Markdown elegante. Use ícones (emojis) para destacar pontos importantes.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de sistemas de varejo e integração de ERP. Sua missão é analisar logs de erros e fornecer diagnósticos precisos e acionáveis.' },
          { role: 'content', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
