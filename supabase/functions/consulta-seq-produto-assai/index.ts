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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for database queries
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

    // PASSO 1: Consultar código interno no Supabase (seq_produto_assai)
    const { data: mappingData, error: mappingError } = await supabaseClient
      .from('seq_produto_assai')
      .select('SEQPRODUTO, DESCCOMPLETA')
      .eq('CODACESSONUM', ean)
      .single();

    if (mappingError || !mappingData) {
      console.warn(`[Consulta] Produto ${ean} não encontrado no Supabase mapping (Error: ${mappingError?.message}). Tentando API legado...`);
      // Fallback para API legado se necessário (opcional, mas mantido por segurança por enquanto)
      try {
        const legacyResponse = await fetch(`http://srv-mupa.ddns.net:5050/api/ean/seqproduto?codbar=${ean}`);
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json();
          if (legacyData && legacyData.id_product) {
            // Adaptar para o mesmo formato
            (mappingData as any) = {
              SEQPRODUTO: legacyData.id_product,
              DESCCOMPLETA: legacyData.descricao
            };
          }
        }
      } catch (e) {
        console.error('Erro no fallback legado:', e);
      }
    }

    if (!mappingData) {
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const internalId = mappingData.SEQPRODUTO;
    const description = mappingData.DESCCOMPLETA;

    // PASSO 2: Consultar preço no marketplace Assai
    let stockPrices = [];
    try {
      console.log(`[Consulta] Buscando estoque/preço para id_product: ${internalId} na loja: ${storeId}`);
      const assaiResponse = await fetch(`https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${parseInt(storeId)}`, {
        headers: {
          'accept': 'application/json',
          'x-basicauthorization': Deno.env.get('ASSAI_BASIC_AUTH') || 'Basic QXNzYWlBcHA6QXNzYWlBcHA=',
          'Authorization': Deno.env.get('ASSAI_BASIC_AUTH') || 'Basic QXNzYWlBcHA6QXNzYWlBcHA='
        }
      });
      
      if (assaiResponse.ok) {
        const fullData = await assaiResponse.json();
        stockPrices = fullData.stock_price || [];
      } else {
        console.warn(`Aviso: API Assai retornou status ${assaiResponse.status}`);
      }
    } catch (e) {
      console.error('Erro ao buscar preço no Assai:', e);
    }

    // PASSO 3: Consultar imagem e cores (opcional/legado)
    let visualData = null;
    try {
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
      stock_prices: stockPrices, // Agora retorna a lista completa
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
