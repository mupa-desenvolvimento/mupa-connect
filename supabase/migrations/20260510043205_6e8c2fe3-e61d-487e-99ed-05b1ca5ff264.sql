CREATE OR REPLACE FUNCTION public.get_dispositivo_por_serial(
  p_serial text, 
  p_apelido_interno text DEFAULT 'aguardando_ativação'::text, 
  p_apps_instalados jsonb DEFAULT '[]'::jsonb, 
  p_pin text DEFAULT NULL::text, 
  p_tipo_da_licenca text DEFAULT NULL::text, 
  p_empresa uuid DEFAULT NULL::uuid, 
  p_grupo_dispositivos text DEFAULT NULL::text, 
  p_campanhas jsonb DEFAULT '[]'::jsonb, 
  p_ip_dispositivo text DEFAULT NULL::text, 
  p_num_filial text DEFAULT NULL::text, 
  p_online boolean DEFAULT true, 
  p_device_type text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_device_id INT8;
  v_result JSONB;
  v_apps_array text[];
  v_campanhas_array text[];
BEGIN
  -- 1. Converter JSONB para text[] para compatibilidade com a tabela
  v_apps_array := public.jsonb_to_text_array(p_apps_instalados);
  v_campanhas_array := public.jsonb_to_text_array(p_campanhas);

  -- 2. Verificar se o dispositivo já existe
  SELECT id INTO v_device_id FROM public.dispositivos WHERE serial = p_serial;

  -- 3. Se não existir, retorna NULL (não cadastrado)
  IF v_device_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 4. ATUALIZAR DISPOSITIVO EXISTENTE (Heartbeat/Sync)
  UPDATE public.dispositivos SET
    ip_dispositivo = COALESCE(p_ip_dispositivo, ip_dispositivo),
    online = COALESCE(p_online, online),
    apps_instalados = v_apps_array,
    campanhas = v_campanhas_array,
    tipo_da_licenca = COALESCE(p_tipo_da_licenca, tipo_da_licenca),
    num_filial = COALESCE(p_num_filial, num_filial),
    pin = COALESCE(p_pin, pin),
    empresa = COALESCE(p_pin, empresa),
    grupo_dispositivos = COALESCE(p_grupo_dispositivos, grupo_dispositivos),
    type = COALESCE(p_device_type, type),
    last_heartbeat_at = NOW(),
    atualizado = NOW()
  WHERE id = v_device_id;

  -- 5. Preparar retorno completo
  SELECT jsonb_build_object(
    'apelido_interno', d.apelido_interno,
    'apps_instalados', COALESCE(to_jsonb(d.apps_instalados), '[]'::jsonb),
    'atualizado', d.atualizado,
    'campanhas', COALESCE(to_jsonb(d.campanhas), '[]'::jsonb),
    'empresa', d.empresa,
    'grupo_dispositivos', d.grupo_dispositivos,
    'id', d.id,
    'ip_dispositivo', COALESCE(d.ip_dispositivo, ''),
    'num_filial', d.num_filial,
    'online', d.online,
    'pin', d.pin,
    'serial', d.serial,
    'tipo_da_licenca', d.tipo_da_licenca,
    'type', d.type,
    'persistence', COALESCE(d.persistence, false)
  ) INTO v_result
  FROM public.dispositivos d
  WHERE d.id = v_device_id;

  RETURN v_result;
END;
$function$;