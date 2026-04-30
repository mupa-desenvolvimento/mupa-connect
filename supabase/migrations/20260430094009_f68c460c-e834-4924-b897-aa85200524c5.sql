-- Função SECURITY DEFINER para obter company_id sem acionar RLS recursivo
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- Recria a policy de admins evitando subquery direta na mesma tabela
DROP POLICY IF EXISTS "Admins podem ver perfis da mesma empresa" ON public.user_profiles;

CREATE POLICY "Admins podem ver perfis da mesma empresa"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin_global'::app_role
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
    AND company_id = public.get_current_user_company_id()
  )
);