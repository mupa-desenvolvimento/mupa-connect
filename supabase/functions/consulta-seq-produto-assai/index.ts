import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const body = await req.json()
    const { ean, store_id: overrideStoreId, device_serial } = body

    if (!ean) {
      return new Response(JSON.stringify({ error: 'EAN is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Tentar descobrir a loja e integração pelo serial do dispositivo ou usar default
    let storeId = overrideStoreId || '53'
    let imageBaseUrl = 'http://srv-mupa.ddns.net:5050/produto-imagem'

    if (device_serial) {
      const { data: device } = await supabaseClient
        .from('dispositivos')
        .select('company_id, num_filial')
        .eq('serial', device_serial)
        .single()

      if (device) {
        if (device.num_filial) storeId = String(device.num_filial)
        
        const { data: integration } = await supabaseClient
          .from('company_integrations')
          .select('settings')
          .eq('company_id', device.company_id)
          .eq('is_active', true)
          .single()
        
        if (integration?.settings) {
          if (integration.settings.loja) storeId = String(integration.settings.loja)
          if (integration.settings.image_base_url) imageBaseUrl = integration.settings.image_base_url
        }
      }
    }

    console.log(`[Consulta] Buscando mapping para EAN: ${ean} (Loja: ${storeId})`);

    // PASSO 1: Consultar código interno no novo endpoint
    let mappingData = null;
    try {
      const mappingResponse = await fetch(`http://srv-mupa.ddns.net:5050/api/ean/seqproduto?codbar=${ean}`);
      if (mappingResponse.ok) {
        mappingData = await mappingResponse.json();
      } else {
        console.error(`Erro no mapping API: ${mappingResponse.status}`);
      }
    } catch (e) {
      console.error('Erro ao buscar mapping externo:', e);
    }

    if (!mappingData) {
      return new Response(JSON.stringify({ error: 'Produto não encontrado na base de dados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const internalId = mappingData.id_product;
    const description = mappingData.descricao;

    // PASSO 2: Consultar preço no marketplace Assai
    let priceData = null;
    try {
      console.log(`[Consulta] Buscando preço para id_product: ${internalId} na loja: ${storeId}`);
      const assaiResponse = await fetch(`https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`, {
        headers: {
          'accept': 'application/json',
          'x-basicauthorization': Deno.env.get('ASSAI_BASIC_AUTH') || 'Basic QXNzYWlBcHA6QXNzYWlBcHA=' 
        }
      });
      
      if (assaiResponse.ok) {
        const fullPriceData = await assaiResponse.json();
        priceData = Array.isArray(fullPriceData) ? fullPriceData[0] : fullPriceData;
      } else {
        console.warn(`Aviso: API de preço retornou status ${assaiResponse.status}`);
      }
    } catch (e) {
      console.error('Erro ao buscar preço:', e);
    }

    // PASSO 3: Consultar imagem e cores
    let visualData = null;
    try {
      console.log(`[Consulta] Buscando visual para EAN: ${ean}`);
      const imageResponse = await fetch(`${imageBaseUrl.replace(/\/$/, '')}/${ean}`);
      if (imageResponse.ok) {
        visualData = await imageResponse.json();
      }
    } catch (e) {
      console.error('Erro ao buscar imagem:', e);
    }

    const result = {
      ean,
      internal_id: internalId,
      description: description,
      price: priceData,
      visual: visualData
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in consulta-seq-produto-assai:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})