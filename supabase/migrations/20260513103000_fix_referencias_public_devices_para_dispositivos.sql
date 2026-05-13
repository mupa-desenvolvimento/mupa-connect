-- Corrige referências à tabela inexistente public.devices (o projeto usa public.dispositivos)
-- Impacto direto: salvar playlists pode disparar comandos (device_commands) e falhar em triggers/policies que consultavam public.devices.

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
    OR d.device_uuid = NEW.device_id
    OR d.serial = NEW.device_id
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
    OR d.device_uuid = NEW.device_id
    OR d.serial = NEW.device_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- RLS: remover políticas antigas que referenciavam public.devices e recriar isolamento por tenant
DROP POLICY IF EXISTS "tenant can view device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can issue device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can update device commands" ON public.device_commands;
DROP POLICY IF EXISTS "company_isolation_device_commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant_isolation_device_commands" ON public.device_commands;

CREATE POLICY "tenant_isolation_device_commands"
ON public.device_commands
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
  )
);

