import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ean, store_id = '53' } = await req.json()

    if (!ean) {
      return new Response(JSON.stringify({ error: 'EAN is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`[Consulta] Buscando mapping para EAN: ${ean}`);

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

    // PASSO 2: Consultar preço no marketplace Assai (opcional, não falha se der erro)
    let priceData = null;
    try {
      console.log(`[Consulta] Buscando preço para id_product: ${internalId}`);
      const assaiResponse = await fetch(`https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${store_id}`, {
        headers: {
          'accept': 'application/json',
          'x-basicauthorization': Deno.env.get('ASSAI_BASIC_AUTH') || 'Basic QXNzYWlBcHA6QXNzYWlBcHA=' 
        }
      });
      
      if (assaiResponse.ok) {
        const fullPriceData = await assaiResponse.json();
        priceData = Array.isArray(fullPriceData) ? fullPriceData[0] : fullPriceData;
      } else {
        const errorText = await assaiResponse.text();
        console.warn(`Aviso: API de preço retornou status ${assaiResponse.status}`);
        // Se for HTML (como bloqueio da Imperva), não logamos o texto todo
        if (errorText.includes('<html')) {
          console.warn('API de preço retornou HTML (provavelmente bloqueio de firewall)');
        } else {
          console.warn('Erro da API de preço:', errorText);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar preço:', e);
    }

    // PASSO 3: Consultar imagem e cores
    let visualData = null;
    try {
      console.log(`[Consulta] Buscando visual para EAN: ${ean}`);
      const imageResponse = await fetch(`http://srv-mupa.ddns.net:5050/produto-imagem/${ean}`);
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

    console.log('[Consulta] Sucesso:', result);

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
