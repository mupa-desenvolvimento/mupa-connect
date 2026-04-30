-- Garantir RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para Admins (Global e Empresa)
DROP POLICY IF EXISTS "Admins podem ver perfis" ON public.profiles;
CREATE POLICY "Admins podem ver perfis" 
ON public.profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'admin_global')
    )
    OR id = auth.uid()
);

-- Popular perfis faltantes para usuários existentes (operação manual segura)
INSERT INTO public.profiles (id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Colaborador'), email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
