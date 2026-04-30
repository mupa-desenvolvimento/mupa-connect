-- Refazer a política de INSERT para garantir que funcione corretamente
DROP POLICY IF EXISTS "Inserção de mídias por tenant" ON public.media_items;

CREATE POLICY "Inserção de mídias por tenant"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (
  (tenant_id IN (
    SELECT m.tenant_id
    FROM user_tenant_mappings m
    WHERE m.user_id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
);

-- Refazer a política de UPDATE para permitir alteração do auto_delete
DROP POLICY IF EXISTS "Authenticated users can move media to folders" ON public.media_items;

CREATE POLICY "Atualização de mídias por tenant"
ON public.media_items
FOR UPDATE
TO authenticated
USING (
  (tenant_id IN (
    SELECT m.tenant_id
    FROM user_tenant_mappings m
    WHERE m.user_id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
)
WITH CHECK (
  (tenant_id IN (
    SELECT m.tenant_id
    FROM user_tenant_mappings m
    WHERE m.user_id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
);