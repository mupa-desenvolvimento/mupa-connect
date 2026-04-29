-- Adicionar uma política mais permissiva para inserção na tabela media_items
-- Isso garante que qualquer usuário autenticado possa registrar uma mídia enviada
CREATE POLICY "Permitir inserção de media_items por usuários autenticados"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Também garantir que possam ver os itens (Select)
CREATE POLICY "Permitir leitura de media_items por usuários autenticados"
ON public.media_items
FOR SELECT
TO authenticated
USING (true);
