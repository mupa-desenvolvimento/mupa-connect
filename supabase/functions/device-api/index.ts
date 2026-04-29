
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    const body = await req.json()
    const { serial, playlist_id, media_id, payload } = body

    if (!serial) {
      return new Response(JSON.stringify({ error: 'Serial is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Buscar o dispositivo_id pelo serial
    const { data: device, error: deviceError } = await supabaseClient
      .from('dispositivos')
      .select('id')
      .eq('serial', serial)
      .maybeSingle()

    if (deviceError || !device) {
      console.error('Device not found for serial:', serial)
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    let updateData: any = {}
    let eventType = ''

    if (path === 'heartbeat') {
      eventType = 'heartbeat'
      updateData = { 
        last_heartbeat_at: new Date().toISOString() 
      }
    } else if (path === 'proof') {
      eventType = 'proof'
      updateData = { 
        last_proof_at: new Date().toISOString(),
        current_playlist_id: playlist_id,
        current_media_id: media_id
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Atualizar tabela dispositivos
    const { error: updateError } = await supabaseClient
      .from('dispositivos')
      .update(updateData)
      .eq('id', device.id)

    // Registrar log na tabela device_logs
    await supabaseClient
      .from('device_logs')
      .insert({
        dispositivo_id: device.id,
        serial: serial,
        event_type: eventType,
        payload: payload || body,
        created_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Error updating device:', updateError)
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
