-- 1. Criar tabela user_profiles se não existir
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    company_id UUID REFERENCES public.companies(id),
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS em user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para user_profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins podem ver perfis da mesma empresa" ON public.user_profiles;
CREATE POLICY "Admins podem ver perfis da mesma empresa" 
ON public.user_profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 3. Função e Gatilho para sincronizar role com user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover papéis antigos do usuário (opcional, dependendo se permite múltiplos)
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Inserir novo papel se for um valor válido do enum
    IF NEW.role IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, NEW.role::public.app_role);
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar o cast (role inválido no enum), não faz nada ou loga
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_user_role ON public.user_profiles;
CREATE TRIGGER trigger_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

-- 4. Adicionar company_id em campaigns e dispositivos se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'company_id') THEN
        ALTER TABLE public.campaigns ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispositivos' AND column_name = 'company_id') THEN
        ALTER TABLE public.dispositivos ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
END $$;

-- 5. Atualizar RLS para Dispositivos (public.dispositivos)
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso dispositivos por empresa e papel" ON public.dispositivos;
CREATE POLICY "Acesso dispositivos por empresa e papel" 
ON public.dispositivos 
FOR ALL 
USING (
    (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'tecnico'))
        AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
    )
    OR 
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'))
);

-- 6. Atualizar RLS para Playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso playlists por empresa e papel" ON public.playlists;
CREATE POLICY "Acesso playlists por empresa e papel" 
ON public.playlists 
FOR ALL 
USING (
    (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'marketing'))
        AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
    )
    OR 
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'))
);

-- 7. Atualizar RLS para Campanhas
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso campanhas por empresa e papel" ON public.campaigns;
CREATE POLICY "Acesso campanhas por empresa e papel" 
ON public.campaigns 
FOR ALL 
USING (
    (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'marketing'))
        AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
    )
    OR 
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'))
);
