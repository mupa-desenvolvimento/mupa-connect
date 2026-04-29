-- Primeiro, removemos as políticas muito genéricas que criamos anteriormente para evitar conflitos
DROP POLICY IF EXISTS "Permitir inserção de media_items por usuários autenticados" ON public.media_items;
DROP POLICY IF EXISTS "Permitir leitura de media_items por usuários autenticados" ON public.media_items;
DROP POLICY IF EXISTS "Users can manage their own media items" ON public.media_items;
DROP POLICY IF EXISTS "Tenant admins can insert media" ON public.media_items;
DROP POLICY IF EXISTS "Admins can manage media" ON public.media_items;

-- Habilitar RLS (caso não esteja)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- 1. Política de LEITURA (SELECT): Usuário só vê mídias do seu tenant
-- Usamos uma subquery simples ou join para validar o tenant_id do usuário logado
CREATE POLICY "Usuários veem apenas mídias do seu tenant"
ON public.media_items
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.empresas WHERE _id IN (SELECT company FROM public.users WHERE id = auth.uid())
  )
  OR 
  is_super_admin(auth.uid())
);

-- 2. Política de INSERÇÃO (INSERT): Usuário só insere mídias para o seu tenant
CREATE POLICY "Usuários inserem mídias apenas para o seu tenant"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.empresas WHERE _id IN (SELECT company FROM public.users WHERE id = auth.uid())
  )
  OR 
  is_super_admin(auth.uid())
);

-- 3. Política de ATUALIZAÇÃO (UPDATE): Apenas para o próprio tenant
CREATE POLICY "Usuários atualizam mídias apenas do seu tenant"
ON public.media_items
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.empresas WHERE _id IN (SELECT company FROM public.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.empresas WHERE _id IN (SELECT company FROM public.users WHERE id = auth.uid())
  )
);

-- 4. Política de EXCLUSÃO (DELETE): Apenas para o próprio tenant
CREATE POLICY "Usuários excluem mídias apenas do seu tenant"
ON public.media_items
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.empresas WHERE _id IN (SELECT company FROM public.users WHERE id = auth.uid())
  )
  OR 
  is_super_admin(auth.uid())
);
