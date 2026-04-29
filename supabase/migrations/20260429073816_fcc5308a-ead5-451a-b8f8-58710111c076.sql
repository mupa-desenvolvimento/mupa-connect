-- Remover políticas complexas que podem estar causando falsos negativos no RLS
DROP POLICY IF EXISTS "Gerenciamento de mídias por tenant" ON public.media_items;
DROP POLICY IF EXISTS "Usuários veem apenas mídias do seu tenant" ON public.media_items;
DROP POLICY IF EXISTS "Usuários inserem mídias apenas para o seu tenant" ON public.media_items;

-- Criar políticas diretas e performáticas
CREATE POLICY "Leitura de mídias por tenant"
ON public.media_items
FOR SELECT
TO authenticated
USING (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);

CREATE POLICY "Inserção de mídias por tenant"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);

CREATE POLICY "Exclusão de mídias por tenant"
ON public.media_items
FOR DELETE
TO authenticated
USING (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);
