import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const sampleErrors = errors.slice(0, 50).map(e => ({
      p: e.product_name,
      e: e.ean,
      s: e.store_name,
      d: e.device_name || e.device_serial,
      t: e.error_type,
      c: e.error_count
    }));

    const prompt = `Analise os seguintes erros de consulta de produtos:
    ${JSON.stringify(sampleErrors)}
    
    Forneça:
    1. **Resumo Executivo**
    2. **Insights Críticos**
    3. **Possíveis Causas**
    4. **Recomendações**
    Responda em Português (Brasil) com Markdown e emojis.`;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY is not set');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de sistemas de varejo e integração de ERP.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`AI Gateway error: ${errorData}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-errors function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
