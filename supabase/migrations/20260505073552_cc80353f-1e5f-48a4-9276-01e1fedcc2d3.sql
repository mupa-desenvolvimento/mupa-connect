-- Função para obter ou cadastrar dispositivo por serial
CREATE OR REPLACE FUNCTION public.get_dispositivo_por_serial(
  p_serial TEXT,
  p_apelido_interno TEXT DEFAULT 'aguardando_ativação',
  p_apps_instalados JSONB DEFAULT '[]'::jsonb,
  p_pin TEXT DEFAULT NULL,
  p_tipo_da_licenca TEXT DEFAULT NULL,
  p_empresa UUID DEFAULT NULL, -- company_id
  p_grupo_dispositivos TEXT DEFAULT NULL,
  p_campanhas JSONB DEFAULT '[]'::jsonb,
  p_ip_dispositivo TEXT DEFAULT NULL,
  p_num_filial TEXT DEFAULT NULL,
  p_online BOOLEAN DEFAULT TRUE,
  p_device_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id INT8;
  v_tenant_id UUID;
  v_default_playlist_id UUID;
  v_result JSONB;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- 1. Validar empresa e obter o tenant_id associado
  IF p_empresa IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.companies WHERE id = p_empresa;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Empresa informada (UUID: %) não encontrada ou inválida.', p_empresa;
    END IF;
  ELSE
    RAISE EXCEPTION 'O parâmetro empresa (company_id) é obrigatório para o cadastro/identificação.';
  END IF;

  -- 2. Verificar se o dispositivo já existe
  SELECT id INTO v_device_id FROM public.dispositivos WHERE serial = p_serial;

  IF v_device_id IS NULL THEN
    -- 3. CRIAR NOVO DISPOSITIVO
    v_is_new := TRUE;
    
    -- Buscar playlist padrão da empresa/tenant
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
      device_type,
      ip_dispositivo,
      online,
      num_filial,
      apps_instalados,
      playlist_id,
      atualizado,
      criado_em
    ) VALUES (
      p_serial,
      p_apelido_interno,
      v_tenant_id,
      p_empresa,
      p_tipo_da_licenca,
      p_device_type,
      p_ip_dispositivo,
      p_online,
      p_num_filial,
      p_apps_instalados,
      v_default_playlist_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_device_id;

    -- Log de criação
    INSERT INTO public.device_logs (dispositivo_id, serial, event_type, payload)
    VALUES (v_device_id, p_serial, 'device_created', jsonb_build_object('company_id', p_empresa, 'playlist_id', v_default_playlist_id));
    
  ELSE
    -- 4. ATUALIZAR DISPOSITIVO EXISTENTE
    UPDATE public.dispositivos SET
      ip_dispositivo = COALESCE(p_ip_dispositivo, ip_dispositivo),
      online = COALESCE(p_online, online),
      apps_instalados = COALESCE(p_apps_instalados, apps_instalados),
      tipo_da_licenca = COALESCE(p_tipo_da_licenca, tipo_da_licenca),
      device_type = COALESCE(p_device_type, device_type),
      last_heartbeat_at = NOW(),
      atualizado = NOW()
    WHERE id = v_device_id;

    -- Log de atualização
    INSERT INTO public.device_logs (dispositivo_id, serial, event_type, payload)
    VALUES (v_device_id, p_serial, 'device_updated_on_request', jsonb_build_object('ip', p_ip_dispositivo));
  END IF;

  -- 5. Preparar retorno completo do dispositivo para o player
  SELECT jsonb_build_object(
    'id', d.id,
    'serial', d.serial,
    'apelido_interno', d.apelido_interno,
    'company_id', d.company_id,
    'tenant_id', d.tenant_id,
    'playlist_id', d.playlist_id,
    'is_new', v_is_new
  ) INTO v_result
  FROM public.dispositivos d
  WHERE d.id = v_device_id;

  RETURN v_result;
END;
$$;