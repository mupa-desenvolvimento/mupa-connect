-- Adicionar política que permite usuários autenticados inserirem comandos vinculados a dispositivos na tabela dispositivos
CREATE POLICY "Authenticated users can insert device commands"
ON public.device_commands
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dispositivos d
    WHERE d.id::text = device_id::text
  )
);

-- Adicionar política que permite usuários autenticados visualizarem comandos
CREATE POLICY "Authenticated users can view device commands"
ON public.device_commands
FOR SELECT
TO authenticated
USING (true);
