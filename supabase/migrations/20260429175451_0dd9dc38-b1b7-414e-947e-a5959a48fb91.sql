
CREATE OR REPLACE FUNCTION public.set_device_command_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Resolve tenant via tabela `devices` (UUID) só quando o device_id for um UUID válido
  IF NEW.tenant_id IS NULL THEN
    BEGIN
      SELECT c.tenant_id INTO NEW.tenant_id
      FROM public.devices d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = NEW.device_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      NEW.tenant_id := NULL;
    END;
  END IF;

  IF NEW.issued_by IS NULL THEN
    NEW.issued_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_device_execution_log_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    BEGIN
      SELECT c.tenant_id INTO NEW.tenant_id
      FROM public.devices d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = NEW.device_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      NEW.tenant_id := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;
