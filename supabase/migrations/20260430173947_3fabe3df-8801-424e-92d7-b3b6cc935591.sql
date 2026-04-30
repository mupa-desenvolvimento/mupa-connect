-- Remove a política antiga se necessário (opcional, mas bom para garantir)
-- DROP POLICY IF EXISTS "Admin Global pode ver todos os logs" ON public.product_queries_log;

-- Atualiza ou cria a política para permitir admin_global, admin e tecnico
CREATE POLICY "Visualização de logs para administradores e técnicos" 
ON public.product_queries_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin_global', 'admin', 'tecnico')
  )
);