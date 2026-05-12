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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const { ean, product_id, store_id: overrideStoreId, device_serial } = body

    if (!ean && !product_id) {
      console.error("[ASSAI_ERROR] EAN ou Product ID não fornecido");
      return new Response(JSON.stringify({ error: 'EAN or product_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`[ASSAI_INPUT] EAN: ${ean} | ProductID: ${product_id}`);

    // Tentar descobrir a loja pelo serial do dispositivo ou usar default
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
          .limit(1)
          .maybeSingle()
        
        if (integration?.settings) {
          if (integration.settings.loja) storeId = String(integration.settings.loja)
          if (integration.settings.image_base_url) imageBaseUrl = integration.settings.image_base_url
        }
      }
    }

    // PASSO 1: Obter ID interno e Descrição
    let internalId = product_id;
    let description = "Produto";
    let actualEan = ean;

    if (ean) {
      const { data: mappingData, error: mappingError } = await supabaseClient
        .from('seq_produto_assai')
        .select('SEQPRODUTO, DESCCOMPLETA, CODACESSONUM')
        .eq('CODACESSONUM', ean)
        .maybeSingle();

      if (mappingError || !mappingData) {
        console.warn(`[ASSAI_ERROR] Produto ${ean} não encontrado no mapeamento Supabase`);
        if (!product_id) {
          return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          });
        }
      } else {
        internalId = mappingData.SEQPRODUTO;
        description = mappingData.DESCCOMPLETA;
        actualEan = mappingData.CODACESSONUM;
      }
    } else if (product_id) {
      // Se tiver só product_id, tentar buscar descrição e EAN no banco
      const { data: mappingData } = await supabaseClient
        .from('seq_produto_assai')
        .select('DESCCOMPLETA, CODACESSONUM')
        .eq('SEQPRODUTO', product_id)
        .limit(1)
        .maybeSingle();
      
      if (mappingData) {
        description = mappingData.DESCCOMPLETA;
        actualEan = mappingData.CODACESSONUM;
      }
    }

    console.log(`[ASSAI_RESOLVED] ID: ${internalId} | Desc: ${description} | EAN: ${actualEan}`);

    // PASSO 2: Consultar preço no marketplace Assai
    let stockPrices = [];
    try {
      const assaiUrl = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${parseInt(storeId)}`;
      console.log(`[ASSAI_QUERY] ${assaiUrl}`);
      
      const assaiResponse = await fetch(assaiUrl, {
        headers: {
          'accept': 'application/json',
          'x-basicauthorization': 'b3V0Ym91bmRAc3NhaUNvbXBhc3M6MWY1NzZjZGRkZWU3MzcwZTQwZWFkOWM2ZGZmMzM4NzY1MWIxN2FiMg==',
          'Authorization': 'b3V0Ym91bmRAc3NhaUNvbXBhc3M6MWY1NzZjZGRkZWU3MzcwZTQwZWFkOWM2ZGZmMzM4NzY1MWIxN2FiMg==',
          'User-Agent': 'AssaiApp/1.0.0 (iPhone; iOS 15.0; Scale/3.00)',
          'x-app-version': '2.1.0'
        }
      });
      
      if (assaiResponse.ok) {
        const fullData = await assaiResponse.json();
        stockPrices = fullData.stock_price || [];
        console.log(`[ASSAI_PRICE] Encontrado ${stockPrices.length} níveis de preço`);
      } else {
        const errorText = await assaiResponse.text();
        console.warn(`[ASSAI_ERROR] API Assai retornou status ${assaiResponse.status}: ${errorText}`);
      }
    } catch (e) {
      console.error('[ASSAI_ERROR] Erro ao buscar preço no Assai:', e);
    }

    // PASSO 3: Consultar imagem e cores
    let visualData = null;
    try {
      if (actualEan) {
        const visualUrl = `${imageBaseUrl.replace(/\/$/, '')}/${actualEan}`;
        const imageResponse = await fetch(visualUrl);
        if (imageResponse.ok) {
          visualData = await imageResponse.json();
        }
      }
    } catch (e) {
      console.error('[ASSAI_ERROR] Erro ao buscar visual:', e);
    }

    const result = {
      ean: actualEan || ean,
      internal_id: internalId,
      description: description,
      stock_prices: stockPrices,
      visual: visualData
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[ASSAI_ERROR] Critical failure:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
