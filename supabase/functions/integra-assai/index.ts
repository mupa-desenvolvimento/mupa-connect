import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // PASSO 1: Consultar código interno
    const { data: seqData, error: seqError } = await supabase
      .from('seq_produto_assai')
      .select('SEQPRODUTO, DESCCOMPLETA')
      .eq('CODACESSONUM', ean)
      .maybeSingle()

    if (seqError) throw seqError
    if (!seqData) {
      return new Response(JSON.stringify({ error: 'Produto não mapeado no Assai' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const internalId = seqData.SEQPRODUTO

    // PASSO 2: Consultar preço no marketplace Assai
    // Tentativa 1: Endpoint de estoque/preço do marketplace
    let priceData = null
    try {
      const assaiResponse = await fetch(`https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${store_id}`, {
        headers: {
          'accept': 'application/json',
          'x-basicauthorization': Deno.env.get('ASSAI_BASIC_AUTH') || 'Basic QXNzYWlBcHA6QXNzYWlBcHA=' 
        }
      })
      
      if (assaiResponse.ok) {
        const fullPriceData = await assaiResponse.json()
        priceData = Array.isArray(fullPriceData) ? fullPriceData[0] : fullPriceData
      }
    } catch (e) {
      console.error('Erro ao buscar preço:', e)
    }

    // PASSO 3: Consultar imagem e cores
    let visualData = null
    try {
      const imageResponse = await fetch(`http://srv-mupa.ddns.net:5050/produto-imagem/${ean}`)
      if (imageResponse.ok) {
        visualData = await imageResponse.json()
        // Garantir que imagem_url use HTTPS ou pelo menos seja válido
        if (visualData && visualData.imagem_url && visualData.imagem_url.startsWith('http://srv-mupa.ddns.net')) {
          // Se o navegador bloquear mixed content, isso pode ser um problema, mas por ora mantemos o original
          console.log('Visual data carregado:', visualData.imagem_url)
        }
      }
    } catch (e) {
      console.error('Erro ao buscar imagem:', e)
    }

    const result = {
      ean,
      internal_id: internalId,
      description: seqData.DESCCOMPLETA,
      price: priceData,
      visual: visualData
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in integra-assai:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
