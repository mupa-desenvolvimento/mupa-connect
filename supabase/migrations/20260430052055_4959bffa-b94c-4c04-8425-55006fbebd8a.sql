-- Permitir que o próprio usuário insira seu perfil (necessário durante o signup se feito pelo cliente)
CREATE POLICY "Usuários podem inserir seu próprio perfil" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permitir que administradores insiram perfis para sua empresa
CREATE POLICY "Admins podem inserir perfis da mesma empresa" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'admin_global')
    )
);

-- Permitir atualizações (update)
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins podem atualizar perfis da mesma empresa" 
ON public.user_profiles 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'admin_global')
    )
);
