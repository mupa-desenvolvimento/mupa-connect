
-- =========================================================================
-- Realtime command channel + execution logs for devices
-- =========================================================================

-- 1) Add useful columns to device_commands (idempotent)
ALTER TABLE public.device_commands
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS issued_by UUID,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Backfill tenant_id from devices -> companies -> tenants
UPDATE public.device_commands dc
SET tenant_id = c.tenant_id
FROM public.devices d
JOIN public.companies c ON c.id = d.company_id
WHERE dc.device_id = d.id AND dc.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_commands_device_status
  ON public.device_commands (device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_commands_tenant
  ON public.device_commands (tenant_id);

-- 2) Trigger: auto-fill tenant_id and issued_by from auth context
CREATE OR REPLACE FUNCTION public.set_device_command_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT c.tenant_id INTO NEW.tenant_id
    FROM public.devices d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.id = NEW.device_id;
  END IF;

  IF NEW.issued_by IS NULL THEN
    NEW.issued_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_commands_defaults ON public.device_commands;
CREATE TRIGGER trg_device_commands_defaults
  BEFORE INSERT ON public.device_commands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_device_command_defaults();

-- 3) RLS on device_commands (tenant-scoped)
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant can view device commands" ON public.device_commands;
CREATE POLICY "tenant can view device commands"
  ON public.device_commands
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "tenant can issue device commands" ON public.device_commands;
CREATE POLICY "tenant can issue device commands"
  ON public.device_commands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = device_id
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "tenant can update device commands" ON public.device_commands;
CREATE POLICY "tenant can update device commands"
  ON public.device_commands
  FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- 4) New table: execution logs per command
CREATE TABLE IF NOT EXISTS public.device_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES public.device_commands(id) ON DELETE SET NULL,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  tenant_id UUID,
  command TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success','error','partial')),
  message TEXT,
  duration_ms INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_exec_logs_device   ON public.device_execution_logs (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_exec_logs_tenant   ON public.device_execution_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_exec_logs_command  ON public.device_execution_logs (command_id);

-- Auto-fill tenant_id on logs
CREATE OR REPLACE FUNCTION public.set_device_execution_log_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT c.tenant_id INTO NEW.tenant_id
    FROM public.devices d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.id = NEW.device_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dev_exec_logs_tenant ON public.device_execution_logs;
CREATE TRIGGER trg_dev_exec_logs_tenant
  BEFORE INSERT ON public.device_execution_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_device_execution_log_tenant();

ALTER TABLE public.device_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant can view execution logs" ON public.device_execution_logs;
CREATE POLICY "tenant can view execution logs"
  ON public.device_execution_logs
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "tenant can insert execution logs" ON public.device_execution_logs;
CREATE POLICY "tenant can insert execution logs"
  ON public.device_execution_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = device_id
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

-- 5) Enable Realtime on both tables
ALTER TABLE public.device_commands REPLICA IDENTITY FULL;
ALTER TABLE public.device_execution_logs REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.device_execution_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
