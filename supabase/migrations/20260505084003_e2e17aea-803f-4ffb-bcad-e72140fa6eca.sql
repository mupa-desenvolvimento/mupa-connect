CREATE OR REPLACE FUNCTION public.jsonb_to_text_array(p_jsonb jsonb)
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(SELECT jsonb_array_elements_text(p_jsonb))::text[];
EXCEPTION WHEN OTHERS THEN
  RETURN ARRAY[]::text[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
AS $$
DECLARE
  v_device_id INT8;
  v_tenant_id UUID;
  v_default_playlist_id UUID;
  v_result JSONB;
  v_is_new BOOLEAN := FALSE;
  v_apps_array text[];
  v_campanhas_array text[];
BEGIN
  -- Converter JSONB para text[] para compatibilidade com a tabela
  v_apps_array := public.jsonb_to_text_array(p_apps_instalados);
  v_campanhas_array := public.jsonb_to_text_array(p_campanhas);

  -- 1. Validar empresa e obter o tenant_id associado
  IF p_empresa IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.companies WHERE id = p_empresa;
  ELSE
    SELECT company_id, tenant_id INTO p_empresa, v_tenant_id 
    FROM public.dispositivos WHERE serial = p_serial LIMIT 1;
    
    IF p_empresa IS NULL THEN
       RAISE EXCEPTION 'O parâmetro empresa (company_id) é obrigatório para novos dispositivos.';
    END IF;
  END IF;

  -- 2. Verificar se o dispositivo já existe
  SELECT id INTO v_device_id FROM public.dispositivos WHERE serial = p_serial;

  IF v_device_id IS NULL THEN
    -- 3. CRIAR NOVO DISPOSITIVO
    v_is_new := TRUE;
    
    SELECT id INTO v_default_playlist_id 
    FROM public.playlists 
    WHERE (company_id = p_empresa OR tenant_id = v_tenant_id)
      AND is_company_default = TRUE 
    LIMIT 1;

    INSERT INTO public.dispositivos (
      serial,
      apelido_interno,
      tenant_id,
      company_id,
      tipo_da_licenca,
      ip_dispositivo,
      online,
      num_filial,
      apps_instalados,
      campanhas,
      playlist_id,
      atualizado,
      device_uuid
    ) VALUES (
      p_serial,
      p_apelido_interno,
      v_tenant_id,
      p_empresa,
      p_tipo_da_licenca,
      p_ip_dispositivo,
      p_online,
      p_num_filial,
      v_apps_array,
      v_campanhas_array,
      v_default_playlist_id,
      NOW(),
      gen_random_uuid()
    ) RETURNING id INTO v_device_id;

    INSERT INTO public.device_logs (dispositivo_id, serial, event_type, payload)
    VALUES (v_device_id, p_serial, 'device_created', jsonb_build_object('company_id', p_empresa, 'playlist_id', v_default_playlist_id));
    
  ELSE
    -- 4. ATUALIZAR DISPOSITIVO EXISTENTE
    UPDATE public.dispositivos SET
      ip_dispositivo = COALESCE(p_ip_dispositivo, ip_dispositivo),
      online = COALESCE(p_online, online),
      apps_instalados = v_apps_array, -- Atualiza com o que veio do dispositivo
      campanhas = v_campanhas_array,
      tipo_da_licenca = COALESCE(p_tipo_da_licenca, tipo_da_licenca),
      num_filial = COALESCE(p_num_filial, num_filial),
      last_heartbeat_at = NOW(),
      atualizado = NOW()
    WHERE id = v_device_id;

    INSERT INTO public.device_logs (dispositivo_id, serial, event_type, payload)
    VALUES (v_device_id, p_serial, 'device_updated_on_request', jsonb_build_object('ip', p_ip_dispositivo));
  END IF;

  -- 5. Retorno
  SELECT jsonb_build_object(
    'id', d.id,
    'serial', d.serial,
    'device_uuid', d.device_uuid,
    'apelido_interno', d.apelido_interno,
    'num_filial', d.num_filial,
    'company_id', d.company_id,
    'tenant_id', d.tenant_id,
    'playlist_id', d.playlist_id,
    'current_media_id', d.current_media_id,
    'is_maintenance', d.is_maintenance,
    'is_new', v_is_new
  ) INTO v_result
  FROM public.dispositivos d
  WHERE d.id = v_device_id;

  RETURN v_result;
END;
$$;