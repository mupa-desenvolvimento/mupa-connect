-- 1) Drop policies que dependem do tipo UUID de device_id
DROP POLICY IF EXISTS "Authenticated users can insert device commands" ON public.device_commands;
DROP POLICY IF EXISTS "Authenticated users can view device commands" ON public.device_commands;
DROP POLICY IF EXISTS "Users can insert commands for their devices" ON public.device_commands;
DROP POLICY IF EXISTS "Users can view commands for their devices" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can issue device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can update device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can view device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can insert execution logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "tenant can view execution logs" ON public.device_execution_logs;

-- 2) Drop FKs apontando para a tabela legacy `devices` (UUID)
ALTER TABLE public.device_commands DROP CONSTRAINT IF EXISTS device_commands_device_id_fkey;
ALTER TABLE public.device_execution_logs DROP CONSTRAINT IF EXISTS device_execution_logs_device_id_fkey;

-- 3) Converte device_id para TEXT em ambas as tabelas
ALTER TABLE public.device_commands ALTER COLUMN device_id TYPE text USING device_id::text;
ALTER TABLE public.device_execution_logs ALTER COLUMN device_id TYPE text USING device_id::text;

-- 4) Índices para performance
CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON public.device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_execution_logs_device_id ON public.device_execution_logs(device_id);

-- 5) Policies simples para usuários autenticados
CREATE POLICY "Authenticated can view device commands"
  ON public.device_commands FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert device commands"
  ON public.device_commands FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update device commands"
  ON public.device_commands FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can view execution logs"
  ON public.device_execution_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert execution logs"
  ON public.device_execution_logs FOR INSERT
  TO authenticated WITH CHECK (true);