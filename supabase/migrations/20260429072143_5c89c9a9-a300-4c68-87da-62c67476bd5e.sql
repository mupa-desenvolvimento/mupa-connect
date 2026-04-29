-- Função para obter todos os tenant_ids de um usuário
CREATE OR REPLACE FUNCTION public.get_user_tenants(check_user_id UUID)
RETURNS TABLE (tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
    SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = check_user_id
    UNION
    SELECT e.id FROM public.empresas e 
    JOIN public.users u ON e._id = u.company 
    WHERE u.id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para verificar se um usuário pertence a um tenant específico
CREATE OR REPLACE FUNCTION public.is_member_of_tenant(check_user_id UUID, check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins sempre têm acesso
  IF public.is_super_admin(check_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_mappings WHERE user_id = check_user_id AND tenant_id = check_tenant_id
    UNION
    SELECT 1 FROM public.empresas e 
    JOIN public.users u ON e._id = u.company 
    WHERE u.id = check_user_id AND e.id = check_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover políticas antigas para recriá-las usando as novas funções
DROP POLICY IF EXISTS "Usuários veem apenas mídias do seu tenant" ON public.media_items;
DROP POLICY IF EXISTS "Usuários inserem mídias apenas para o seu tenant" ON public.media_items;
DROP POLICY IF EXISTS "Usuários atualizam mídias apenas do seu tenant" ON public.media_items;
DROP POLICY IF EXISTS "Usuários excluem mídias apenas do seu tenant" ON public.media_items;

-- Recriar políticas para media_items
CREATE POLICY "Gerenciamento de mídias por tenant"
ON public.media_items
FOR ALL
TO authenticated
USING (public.is_member_of_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));

-- Aplicar o mesmo padrão para a tabela folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view folders of their tenant" ON public.folders;
DROP POLICY IF EXISTS "Users can insert folders for their tenant" ON public.folders;
DROP POLICY IF EXISTS "Users can update folders for their tenant" ON public.folders;
DROP POLICY IF EXISTS "Users can delete folders for their tenant" ON public.folders;

CREATE POLICY "Gerenciamento de pastas por tenant"
ON public.folders
FOR ALL
TO authenticated
USING (public.is_member_of_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));
