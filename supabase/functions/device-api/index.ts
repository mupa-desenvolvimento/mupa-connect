
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

    if (path === 'manifest') {
      const { data: device, error: deviceError } = await supabaseClient
        .from('dispositivos')
        .select('*')
        .or(`serial.eq."${serial}",apelido_interno.eq."${serial}"`)
        .maybeSingle()

      if (deviceError || !device) {
        console.error('Device not found for manifest:', serial)
        return new Response(JSON.stringify({ error: 'Device not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      if (!device.playlist_id) {
        return new Response(JSON.stringify({ error: 'Device has no playlist' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      const { data: playlist, error: playlistError } = await supabaseClient
        .from('playlists')
        .select('id, name, updated_at, schedule, fallback_media_id')
        .eq('id', device.playlist_id)
        .maybeSingle()

      if (playlistError || !playlist) {
        console.error('Playlist not found for manifest:', playlistError)
        return new Response(JSON.stringify({ error: 'Playlist not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      const { data: playlistItems, error: itemsError } = await supabaseClient
        .from('playlist_items')
        .select('id, media_id, position, ordem, duracao, tipo, media_items(id, name, file_url, thumbnail_url, type, duration)')
        .eq('playlist_id', playlist.id)

      if (itemsError) {
        console.error('Playlist items not found for manifest:', itemsError)
        return new Response(JSON.stringify({ error: 'Playlist items not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      const mapItems = (items: any[]) => (items || [])
        .sort((a, b) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
        .map((item) => {
          const media = Array.isArray(item.media_items) ? item.media_items[0] : item.media_items
          return {
            id: item.media_id || item.id,
            type: item.tipo || media?.type || 'image',
            url: media?.file_url,
            duration: item.duracao || media?.duration || 10,
            name: media?.name || 'Sem nome'
          }
        })
        .filter((item) => item.url)

      const manifest = {
        playlist_id: playlist.id,
        name: playlist.name,
        updated_at: playlist.updated_at || device.atualizado || new Date().toISOString(),
        schedule: playlist.schedule || null,
        schedules: Array.isArray(playlist.schedule) ? playlist.schedule : [],
        fallback_playlist: [],
        fallback_items: [],
        items: mapItems(playlistItems || [])
      }

      return new Response(JSON.stringify({ success: true, device, manifest }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
