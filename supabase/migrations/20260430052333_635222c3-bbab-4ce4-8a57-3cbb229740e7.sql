-- Remover política antiga restritiva
DROP POLICY IF EXISTS "Admins podem ver perfis da mesma empresa" ON public.user_profiles;

-- Criar nova política abrangente para Admins
CREATE POLICY "Admins podem ver perfis da mesma empresa" 
ON public.user_profiles FOR SELECT 
USING (
    -- Admin Global vê tudo
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin_global'
    )
    OR
    -- Admin de Empresa vê usuários da mesma empresa
    (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        ) 
        AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
    )
);
