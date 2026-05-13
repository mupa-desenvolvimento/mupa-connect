-- Fix: "operator does not exist: uuid = text" ao inserir em device_commands/device_execution_logs
-- Causa: comparação de dispositivos.device_uuid (uuid) com NEW.device_id (text) em triggers.

CREATE OR REPLACE FUNCTION public.set_device_command_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT c.tenant_id INTO NEW.tenant_id
    FROM public.dispositivos d
    JOIN public.companies c ON c.id = d.company_id
    WHERE (
      NEW.device_id ~ '^[0-9]+$'
      AND d.id = NEW.device_id::bigint
    )
    OR (d.device_uuid::text = NEW.device_id)
    OR (d.serial = NEW.device_id)
    LIMIT 1;
  END IF;

  IF NEW.issued_by IS NULL THEN
    NEW.issued_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_device_execution_log_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT c.tenant_id INTO NEW.tenant_id
    FROM public.dispositivos d
    JOIN public.companies c ON c.id = d.company_id
    WHERE (
      NEW.device_id ~ '^[0-9]+$'
      AND d.id = NEW.device_id::bigint
    )
    OR (d.device_uuid::text = NEW.device_id)
    OR (d.serial = NEW.device_id)
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

