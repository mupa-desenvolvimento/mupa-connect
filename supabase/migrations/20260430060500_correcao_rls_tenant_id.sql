-- ============================================================
-- CORREÇÃO: RLS COM COLUNAS tenant_id
-- ============================================================
-- Este script verifica a existência de colunas antes de criar políticas

-- ============================================================
-- PARTE 1: CORREÇÃO DE RLS EM device_commands
-- ============================================================

DO $$
BEGIN
    -- Verificar se tenant_id existe em device_commands
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_commands' AND column_name = 'tenant_id'
    ) THEN
        -- Coluna existe, criar políticas com tenant_id
        
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "tenant_isolation_device_commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can view device commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can insert device commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can update device commands" ON public.device_commands;
        
        -- Criar política com tenant_id
        CREATE POLICY "tenant_isolation_device_commands" 
        ON public.device_commands
        FOR ALL
        TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        )
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        );
        
        RAISE NOTICE 'Políticas criadas para device_commands usando tenant_id';
    ELSE
        -- Coluna não existe, criar políticas baseadas em device_id
        
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "tenant_isolation_device_commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can view device commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can insert device commands" ON public.device_commands;
        DROP POLICY IF EXISTS "Authenticated can update device commands" ON public.device_commands;
        
        -- Criar política baseada em company_id via device_id
        CREATE POLICY "company_isolation_device_commands" 
        ON public.device_commands
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.dispositivos d
                WHERE d.id::text = device_commands.device_id
                AND d.company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.dispositivos d
                WHERE d.id::text = device_commands.device_id
                AND d.company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        );
        
        RAISE NOTICE 'Políticas criadas para device_commands usando company_id via device_id';
    END IF;
END $$;

-- ============================================================
-- PARTE 2: CORREÇÃO DE RLS EM device_execution_logs
-- ============================================================

DO $$
BEGIN
    -- Verificar se tenant_id existe em device_execution_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_execution_logs' AND column_name = 'tenant_id'
    ) THEN
        -- Coluna existe, criar políticas com tenant_id
        
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "tenant_isolation_device_execution_logs" ON public.device_execution_logs;
        DROP POLICY IF EXISTS "Authenticated can view execution logs" ON public.device_execution_logs;
        DROP POLICY IF EXISTS "Authenticated can insert execution logs" ON public.device_execution_logs;
        
        -- Criar política com tenant_id
        CREATE POLICY "tenant_isolation_device_execution_logs" 
        ON public.device_execution_logs
        FOR ALL
        TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        )
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        );
        
        RAISE NOTICE 'Políticas criadas para device_execution_logs usando tenant_id';
    ELSE
        -- Coluna não existe, criar políticas baseadas em device_id
        
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "tenant_isolation_device_execution_logs" ON public.device_execution_logs;
        DROP POLICY IF EXISTS "Authenticated can view execution logs" ON public.device_execution_logs;
        DROP POLICY IF EXISTS "Authenticated can insert execution logs" ON public.device_execution_logs;
        
        -- Criar política baseada em company_id via device_id
        CREATE POLICY "company_isolation_device_execution_logs" 
        ON public.device_execution_logs
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.dispositivos d
                WHERE d.id::text = device_execution_logs.device_id
                AND d.company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.dispositivos d
                WHERE d.id::text = device_execution_logs.device_id
                AND d.company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
            )
        );
        
        RAISE NOTICE 'Políticas criadas para device_execution_logs usando company_id via device_id';
    END IF;
END $$;

-- ============================================================
-- PARTE 3: ADICIONAR COLUNA tenant_id SE NECESSÁRIO
-- ============================================================

-- Adicionar tenant_id em device_commands se não existir
ALTER TABLE public.device_commands 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Adicionar tenant_id em device_execution_logs se não existir
ALTER TABLE public.device_execution_logs 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================================
-- PARTE 4: TRIGGER PARA PREENCHER tenant_id AUTOMATICAMENTE
-- ============================================================

-- Trigger para device_commands
CREATE OR REPLACE FUNCTION public.set_device_command_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT c.tenant_id INTO NEW.tenant_id
        FROM public.dispositivos d
        JOIN public.companies c ON c.id = d.company_id
        WHERE d.id::text = NEW.device_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_device_command_tenant ON public.device_commands;
CREATE TRIGGER trg_set_device_command_tenant
    BEFORE INSERT ON public.device_commands
    FOR EACH ROW EXECUTE FUNCTION public.set_device_command_tenant();

-- Trigger para device_execution_logs
CREATE OR REPLACE FUNCTION public.set_device_execution_log_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT c.tenant_id INTO NEW.tenant_id
        FROM public.dispositivos d
        JOIN public.companies c ON c.id = d.company_id
        WHERE d.id::text = NEW.device_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_device_execution_log_tenant ON public.device_execution_logs;
CREATE TRIGGER trg_set_device_execution_log_tenant
    BEFORE INSERT ON public.device_execution_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_device_execution_log_tenant();

-- ============================================================
-- PARTE 5: RECRIAR POLÍTICAS COM tenant_id (AGORA GARANTIDO)
-- ============================================================

-- Agora que tenant_id existe, recriar políticas corretamente
DROP POLICY IF EXISTS "company_isolation_device_commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant_isolation_device_commands" ON public.device_commands;

CREATE POLICY "tenant_isolation_device_commands" 
ON public.device_commands
FOR ALL
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
);

DROP POLICY IF EXISTS "company_isolation_device_execution_logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "tenant_isolation_device_execution_logs" ON public.device_execution_logs;

CREATE POLICY "tenant_isolation_device_execution_logs" 
ON public.device_execution_logs
FOR ALL
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

SELECT 'Correção aplicada com sucesso' as status;

/*
-- Verificar colunas criadas:
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('device_commands', 'device_execution_logs')
AND column_name = 'tenant_id';

-- Verificar políticas:
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('device_commands', 'device_execution_logs');
*/
