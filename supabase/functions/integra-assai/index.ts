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
    const { ean, product_id, store_id: overrideStoreId } = body

    if (!ean && !product_id) {
      return new Response(JSON.stringify({ error: 'EAN or product_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let storeId = overrideStoreId || '53'
    let seqProduto = product_id
    let descricao = "Produto"
    let actualEan = ean

    console.log(`[EAN] ${ean || 'N/A'}`)

    // PASSO 1 — Consultar código interno (SEQPRODUTO)
    if (ean) {
      const { data: mapping, error: mappingError } = await supabaseClient
        .from('seq_produto_assai')
        .select('SEQPRODUTO, DESCCOMPLETA, CODACESSONUM')
        .eq('CODACESSONUM', ean)
        .maybeSingle()

      if (mappingError || !mapping) {
        console.warn(`[ERROR] Produto não encontrado no mapeamento Supabase para EAN: ${ean}`)
        return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      seqProduto = mapping.SEQPRODUTO
      descricao = mapping.DESCCOMPLETA
      actualEan = mapping.CODACESSONUM
    } else if (product_id) {
      const { data: mapping } = await supabaseClient
        .from('seq_produto_assai')
        .select('DESCCOMPLETA, CODACESSONUM')
        .eq('SEQPRODUTO', product_id)
        .maybeSingle()
      
      if (mapping) {
        descricao = mapping.DESCCOMPLETA
        actualEan = mapping.CODACESSONUM
      }
    }

    console.log(`[SEQPRODUTO] ${seqProduto}`)

    // PASSO 2 — Consultar preços no marketplace Assai
    const assaiUrl = `https://marketplace.assai.com.br/stock?id_product=${seqProduto}&id_store=${storeId}`
    console.log(`[ASSAI_QUERY] ${assaiUrl}`)

    const assaiResponse = await fetch(assaiUrl, {
      headers: {
        'accept': 'application/json',
        'x-basicauthorization': 'b3V0Ym91bmRAc3NhaUNvbXBhc3M6MWY1NzZjZGRkZWU3MzcwZTQwZWFkOWM2ZGZmMzM4NzY1MWIxN2FiMg',
        'User-Agent': 'AssaiApp/1.0.0 (iPhone; iOS 15.0; Scale/3.00)',
        'x-app-version': '2.1.0'
      }
    })

    if (!assaiResponse.ok) {
      const errorText = await assaiResponse.text()
      console.error(`[ASSAI_ERROR] Status ${assaiResponse.status}: ${errorText}`)
      return new Response(JSON.stringify({ 
        error: 'Preço indisponível', 
        details: `Assai API error: ${assaiResponse.status}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to show "Preço indisponível" in UI instead of error
      })
    }

    const assaiData = await assaiResponse.json()
    const stockPrices = assaiData.stock_price || []
    console.log(`[ASSAI_PRICE]`, JSON.stringify(stockPrices))

    if (stockPrices.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        ean: actualEan,
        internal_id: seqProduto,
        description: descricao,
        stock_prices: [],
        message: 'Preço indisponível'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Consultar visual (Imagens/Cores) - Opcional
    let visualData = null
    try {
      // Usar a mesma lógica de imagem se disponível
      const imageBaseUrl = 'http://srv-mupa.ddns.net:5050/produto-imagem'
      const visualUrl = `${imageBaseUrl}/${actualEan}`
      const visualRes = await fetch(visualUrl)
      if (visualRes.ok) {
        visualData = await visualRes.json()
      }
    } catch (e) {
      console.warn('[VISUAL_ERROR]', e.message)
    }

    const result = {
      success: true,
      ean: actualEan,
      internal_id: seqProduto,
      description: descricao,
      stock_prices: stockPrices,
      visual: visualData
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[CRITICAL_ERROR]', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
