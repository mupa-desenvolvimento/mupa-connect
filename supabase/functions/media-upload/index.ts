import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

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

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string | null
    const tenantId = formData.get('tenantId') as string
    const companyId = formData.get('companyId') as string

    if (!file || !tenantId || !companyId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validação de Tenant/Company no servidor
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('tenant_id, company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.tenant_id !== tenantId || profile.company_id !== companyId) {
       // Se não bater, verificamos se é super admin como fallback
       const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin_global")
        .maybeSingle();
      
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Invalid tenant or company access' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    
    // Buscar nome da empresa para o path do storage
    const { data: companyData } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle()

    const companyName = (companyData?.name || 'company').replace(/[^a-zA-Z0-9]/g, '_')
    const storagePath = `${companyName}_${tenantId}/${fileName}`

    // Upload para o Storage usando o client autenticado (respeita RLS do storage se houver)
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseClient.storage
      .from('media')
      .getPublicUrl(storagePath)

    const type = file.type.startsWith('video') ? 'video' : 'image'

    // Inserção no Banco
    const { data: mediaItem, error: dbError } = await supabaseClient
      .from('media_items')
      .insert({
        name: file.name,
        type: type,
        file_url: publicUrl,
        file_size: file.size,
        folder_id: folderId || null,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'ready'
      })
      .select()
      .single()

    if (dbError) throw dbError

    return new Response(JSON.stringify(mediaItem), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
