-- 1. Tabela de Tokens de Acesso Rápido
CREATE TABLE IF NOT EXISTS public.quick_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id INTEGER, -- Armazenado como inteiro para compatibilidade com dispositivos.id
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Logs de Acesso Rápido
CREATE TABLE IF NOT EXISTS public.quick_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES public.quick_access_tokens(id) ON DELETE SET NULL,
    device_id INTEGER,
    command TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.quick_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_access_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para quick_access_tokens
DROP POLICY IF EXISTS "Leitura anônima via token" ON public.quick_access_tokens;
CREATE POLICY "Leitura anônima via token" 
ON public.quick_access_tokens 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins podem gerenciar tokens" ON public.quick_access_tokens;
CREATE POLICY "Admins podem gerenciar tokens" 
ON public.quick_access_tokens 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'admin_global')
    )
);

-- 5. Políticas para quick_access_logs
DROP POLICY IF EXISTS "Inserção de logs anônima" ON public.quick_access_logs;
CREATE POLICY "Inserção de logs anônima" 
ON public.quick_access_logs 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem ver logs" ON public.quick_access_logs;
CREATE POLICY "Admins podem ver logs" 
ON public.quick_access_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'admin_global')
    )
);

-- 6. Gatilho para updated_at
DROP TRIGGER IF EXISTS update_quick_access_tokens_updated_at ON public.quick_access_tokens;
CREATE TRIGGER update_quick_access_tokens_updated_at
BEFORE UPDATE ON public.quick_access_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
