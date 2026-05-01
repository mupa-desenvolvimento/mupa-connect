import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  console.log(`Recebendo requisição: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Authorization header ausente ou inválido')
      return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')

    // Cliente com service role para operações de DB/Storage (bypassa RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação passando o token explicitamente
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      console.error('Erro de autenticação:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Usuário autenticado: ${user.id}`)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string | null
    const tenantId = formData.get('tenantId') as string
    const companyId = formData.get('companyId') as string

    console.log(`Campos recebidos - Tenant: ${tenantId}, Company: ${companyId}, Folder: ${folderId}, File: ${file?.name}`)

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
       console.log('Validação de perfil falhou, verificando super admin...')
       const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin_global")
        .maybeSingle();
      
      if (!roleData) {
        console.error('Acesso negado: Tenant/Company não correspondem e usuário não é admin')
        return new Response(JSON.stringify({ error: 'Invalid tenant or company access' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const originalName = file.name || 'unnamed'
    const fileExt = originalName.includes('.') ? originalName.split('.').pop() : ''
    const fileName = `${crypto.randomUUID()}${fileExt ? `.${fileExt}` : ''}`
    
    // Buscar nome da empresa para o path do storage
    const { data: companyData } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle()

    const companyName = (companyData?.name || 'company').replace(/[^a-zA-Z0-9]/g, '_')
    const storagePath = `${companyName}_${tenantId}/${fileName}`

    console.log(`Iniciando upload para storage: ${storagePath}`)

    // Upload para o Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload para storage:', uploadError)
      throw uploadError
    }

    console.log('Upload para storage concluído, gerando URL pública...')

    const { data: { publicUrl } } = supabaseClient.storage
      .from('media')
      .getPublicUrl(storagePath)

    const type = file.type.startsWith('video') ? 'video' : 'image'

    console.log('Inserindo registro no banco de dados...')

    // Inserção no Banco
    const { data: mediaItem, error: dbError } = await supabaseClient
      .from('media_items')
      .insert({
        name: originalName,
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

    if (dbError) {
      console.error('Erro na inserção no banco:', dbError)
      throw dbError
    }

    console.log('Upload processado com sucesso!')

    return new Response(JSON.stringify(mediaItem), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Erro geral na função:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

