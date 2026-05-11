import { serve } from \"https://deno.land/std@0.168.0/http/server.ts\"
import { createClient } from \"https://esm.sh/@supabase/supabase-js@2\"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ean } = await req.json()

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

    const { data, error } = await supabase
      .from('seq_produto_assai')
      .select('SEQPRODUTO, DESCCOMPLETA')
      .eq('CODACESSONUM', ean)
      .maybeSingle()

    if (error) throw error

    return new Response(JSON.stringify(data || { error: 'Produto não encontrado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
