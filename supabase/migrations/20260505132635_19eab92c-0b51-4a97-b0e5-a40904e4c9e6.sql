CREATE OR REPLACE FUNCTION public.create_dispositivo(payload jsonb)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_apelido_interno text;
  v_apps_instalados text[];
  v_pin text;
  v_serial text;
  v_tipo_da_licenca text;
  v_empresa text;
  v_grupo_dispositivos text;
  v_campanhas text[];
  v_ip_dispositivo text;
  v_num_filial text;
  v_online boolean;
  v_type text;
  v_id integer;
  
  -- Novos campos obrigatórios
  v_tenant_id uuid;
  v_company_id uuid;
  v_playlist_id uuid;
BEGIN
  v_apelido_interno := payload->>'apelido_interno';
  v_pin := payload->>'pin';
  v_serial := payload->>'serial';
  v_tipo_da_licenca := payload->>'tipo_da_licenca';
  v_empresa := payload->>'empresa';
  v_grupo_dispositivos := payload->>'grupo_dispositivos';
  v_ip_dispositivo := payload->>'ip_dispositivo';
  v_num_filial := payload->>'num_filial';
  v_online := COALESCE((payload->>'online')::boolean, false);
  v_type := payload->>'type';

  -- Validações mínimas
  IF v_serial IS NULL OR v_serial = '' THEN
    RETURN json_build_object('status','error','message','serial obrigatório');
  END IF;

  IF v_empresa IS NULL OR v_empresa = '' THEN
    RETURN json_build_object('status','error','message','O parâmetro empresa (company_id) é obrigatório para novos dispositivos.','code','P0001');
  END IF;

  -- Regra de negócio para empresa específica
  IF v_empresa = 'fd55dbdd-63da-442e-aa99-5575c0496622' THEN
    v_tenant_id  := 'f822bf9d-39e9-4726-82f7-c16bf267bc39';
    v_company_id := 'fd55dbdd-63da-442e-aa99-5575c0496622';
    v_playlist_id := 'e8dab79a-0612-4859-94e0-5e1a6be50756';
  ELSE
    -- Se for outra empresa, tenta converter para UUID se possível, ou deixa nulo
    BEGIN
      v_company_id := v_empresa::uuid;
    EXCEPTION WHEN others THEN
      v_company_id := NULL;
    END;
  END IF;

  -- Arrays (aceita [] ou null)
  v_apps_instalados := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(payload->'apps_instalados')
    ),
    ARRAY[]::text[]
  );

  v_campanhas := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(payload->'campanhas')
    ),
    ARRAY[]::text[]
  );

  -- UPSERT logic
  INSERT INTO public.dispositivos (
    apelido_interno,
    apps_instalados,
    pin,
    serial,
    tipo_da_licenca,
    empresa,
    grupo_dispositivos,
    campanhas,
    ip_dispositivo,
    num_filial,
    online,
    type,
    tenant_id,
    company_id,
    playlist_id
  ) VALUES (
    v_apelido_interno,
    v_apps_instalados,
    v_pin,
    v_serial,
    v_tipo_da_licenca,
    v_empresa,
    v_grupo_dispositivos,
    v_campanhas,
    v_ip_dispositivo,
    v_num_filial,
    v_online,
    v_type,
    v_tenant_id,
    v_company_id,
    v_playlist_id
  )
  ON CONFLICT (serial) DO UPDATE
  SET
    company_id = EXCLUDED.company_id,
    tenant_id = EXCLUDED.tenant_id,
    playlist_id = EXCLUDED.playlist_id,
    apelido_interno = EXCLUDED.apelido_interno,
    online = EXCLUDED.online,
    ip_dispositivo = EXCLUDED.ip_dispositivo,
    atualizado = now()
  RETURNING id INTO v_id;

  RETURN json_build_object('status','success','id',v_id,'serial',v_serial);
END;
$function$;