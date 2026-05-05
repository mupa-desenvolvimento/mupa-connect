-- Criar tabela de logs de auditoria se não existir
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    device_id BIGINT,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS em audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para SuperAdmin ver todos os logs
CREATE POLICY "SuperAdmins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin_global'
    )
);

-- Política para usuários verem apenas seus próprios logs de auditoria
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (user_id = auth.uid());

-- Função para registrar log de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action TEXT,
    p_device_id BIGINT,
    p_old_value JSONB,
    p_new_value JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, device_id, old_value, new_value, metadata)
    VALUES (auth.uid(), p_action, p_device_id, p_old_value, p_new_value, p_metadata)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajustar RLS em dispositivos para SuperAdmin
-- Nota: Assumindo que já existem políticas, vamos adicionar uma específica para admin_global se não houver
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dispositivos' AND policyname = 'SuperAdmin bypass RLS on dispositivos'
    ) THEN
        CREATE POLICY "SuperAdmin bypass RLS on dispositivos" 
        ON public.dispositivos 
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'admin_global'
            )
        );
    END IF;
END $$;
