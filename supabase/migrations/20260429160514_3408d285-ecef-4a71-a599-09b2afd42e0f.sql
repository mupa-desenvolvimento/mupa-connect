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

  -- Normalização do código da empresa conforme solicitado
  IF v_empresa = 'Stok_123' THEN
    v_empresa := '003ZAF';
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

  -- Validações mínimas
  IF v_serial IS NULL OR v_serial = '' THEN
    RETURN json_build_object('status','error','message','serial obrigatório');
  END IF;

  IF v_empresa IS NULL OR v_empresa = '' THEN
    RETURN json_build_object('status','error','message','empresa obrigatório');
  END IF;

  -- Já existe: por segurança, impedimos duplicar serial
  IF EXISTS (
    SELECT 1 FROM public.dispositivos d WHERE d.serial = v_serial
  ) THEN
    RETURN json_build_object('status','error','message','dispositivo já cadastrado');
  END IF;

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
    type
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
    v_type
  )
  RETURNING id INTO v_id;

  RETURN json_build_object('status','success','id',v_id,'serial',v_serial);
END;
$function$;