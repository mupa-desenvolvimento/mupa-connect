-- 1. Adicionar a coluna company_id na tabela media_items se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'company_id') THEN
        ALTER TABLE public.media_items ADD COLUMN company_id UUID;
    END IF;
END $$;

-- 2. Limpar políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "media_items_insert_policy" ON public.media_items;
DROP POLICY IF EXISTS "media_items_update_policy" ON public.media_items;
DROP POLICY IF EXISTS "media_items_delete_policy" ON public.media_items;
DROP POLICY IF EXISTS "media_items_select_policy" ON public.media_items;
DROP POLICY IF EXISTS "Inserção de mídias por tenant" ON public.media_items;
DROP POLICY IF EXISTS "Atualização de mídias por tenant" ON public.media_items;
DROP POLICY IF EXISTS "Leitura de mídias por tenant" ON public.media_items;
DROP POLICY IF EXISTS "Exclusão de mídias por tenant" ON public.media_items;

-- 3. Criar a nova política de INSERT baseada em company_id
CREATE POLICY "allow_insert_media"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id IN (
    SELECT company_id FROM public.user_profiles
    WHERE id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
);

-- 4. Criar política de SELECT
CREATE POLICY "allow_select_media"
ON public.media_items
FOR SELECT
TO authenticated
USING (
  (company_id IN (
    SELECT company_id FROM public.user_profiles
    WHERE id = auth.uid()
  )) OR 
  (tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings
    WHERE user_id = auth.uid()
  )) OR
  (is_super_admin(auth.uid()))
);

-- 5. Criar política de UPDATE
CREATE POLICY "allow_update_media"
ON public.media_items
FOR UPDATE
TO authenticated
USING (
  (company_id IN (
    SELECT company_id FROM public.user_profiles
    WHERE id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
)
WITH CHECK (
  (company_id IN (
    SELECT company_id FROM public.user_profiles
    WHERE id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
);

-- 6. Criar política de DELETE
CREATE POLICY "allow_delete_media"
ON public.media_items
FOR DELETE
TO authenticated
USING (
  (company_id IN (
    SELECT company_id FROM public.user_profiles
    WHERE id = auth.uid()
  )) OR (is_super_admin(auth.uid()))
);

-- Garantir RLS
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;