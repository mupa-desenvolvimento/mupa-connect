-- ============================================================
-- AUDITORIA MUPA 3.0 — CORREÇÕES CONSOLIDADAS
-- Data: 2026-04-30
-- Objetivo: Resolver todos os problemas críticos identificados na auditoria
-- ============================================================

-- ============================================================
-- PARTE 1: BACKUP E PREPARAÇÃO
-- ============================================================

-- Criar tabela de log para acompanhar progresso das correções
CREATE TABLE IF NOT EXISTS public.auditoria_correcoes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa TEXT NOT NULL,
    status TEXT NOT NULL,
    registros_afetados INTEGER DEFAULT 0,
    detalhes TEXT,
    executado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Log de início
INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('inicio', 'iniciado', 'Iniciando correções consolidadas da auditoria');

-- ============================================================
-- PARTE 2: CORREÇÃO DE RLS EM TABELAS CRÍTICAS
-- ============================================================

-- 2.1 Habilitar RLS na tabela companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "tenant_isolation_companies" ON public.companies;
DROP POLICY IF EXISTS "companies_tenant_isolation" ON public.companies;
DROP POLICY IF EXISTS "isolation_companies_by_tenant" ON public.companies;

-- Criar política de isolamento por tenant
CREATE POLICY "tenant_isolation_companies" 
ON public.companies
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

-- Permitir super admins acesso total
CREATE POLICY "admin_global_full_access_companies" 
ON public.companies
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
);

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('rls_companies', 'concluido', 'RLS habilitado em companies com políticas de isolamento por tenant');

-- 2.2 Habilitar RLS na tabela stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "tenant_isolation_stores" ON public.stores;
DROP POLICY IF EXISTS "stores_tenant_isolation" ON public.stores;

-- Criar política de isolamento por tenant
CREATE POLICY "tenant_isolation_stores" 
ON public.stores
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

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('rls_stores', 'concluido', 'RLS habilitado em stores com políticas de isolamento por tenant');

-- 2.3 Habilitar RLS na tabela dispositivos (tabela legada - CRÍTICO)
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "dispositivos_company_access" ON public.dispositivos;
DROP POLICY IF EXISTS "dispositivos_tenant_access" ON public.dispositivos;
DROP POLICY IF EXISTS "Acesso dispositivos por empresa e papel" ON public.dispositivos;

-- Política para super admins
CREATE POLICY "admin_global_dispositivos" 
ON public.dispositivos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
    )
);

-- Política para usuários comuns (acesso por company_id via user_profiles)
CREATE POLICY "user_dispositivos_access" 
ON public.dispositivos
FOR ALL
TO authenticated
USING (
    company_id IS NOT NULL 
    AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
)
WITH CHECK (
    company_id IS NOT NULL 
    AND company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Política para admins de empresa (acesso a todos os dispositivos da sua empresa)
CREATE POLICY "admin_dispositivos_access" 
ON public.dispositivos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'admin_global')
    )
    AND (
        company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    )
);

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('rls_dispositivos', 'concluido', 'RLS habilitado em dispositivos com políticas de isolamento');

-- 2.4 Ajustar RLS em device_commands (tornar mais restritiva)
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

-- Remover políticas permissivas
DROP POLICY IF EXISTS "Authenticated can view device commands" ON public.device_commands;
DROP POLICY IF EXISTS "Authenticated can insert device commands" ON public.device_commands;
DROP POLICY IF EXISTS "Authenticated can update device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can view device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can issue device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant can update device commands" ON public.device_commands;
DROP POLICY IF EXISTS "tenant_isolation_device_commands" ON public.device_commands;
DROP POLICY IF EXISTS "company_isolation_device_commands" ON public.device_commands;

-- Recriar com isolamento por tenant
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

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('rls_device_commands', 'concluido', 'RLS restritiva aplicada em device_commands');

-- 2.5 Ajustar RLS em device_execution_logs (tornar mais restritiva)
ALTER TABLE public.device_execution_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas permissivas
DROP POLICY IF EXISTS "Authenticated can view execution logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "Authenticated can insert execution logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "tenant can view execution logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "tenant can insert execution logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "tenant_isolation_device_execution_logs" ON public.device_execution_logs;
DROP POLICY IF EXISTS "company_isolation_device_execution_logs" ON public.device_execution_logs;

-- Recriar com isolamento por tenant
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

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('rls_device_execution_logs', 'concluido', 'RLS restritiva aplicada em device_execution_logs');

-- ============================================================
-- PARTE 3: CORREÇÃO DE user_profiles (GARANTIR company_id)
-- ============================================================

-- 3.1 Verificar e logar quantidade de registros sem company_id
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM public.user_profiles 
    WHERE company_id IS NULL;
    
    INSERT INTO public.auditoria_correcoes_log (etapa, status, registros_afetados, detalhes)
    VALUES ('verificacao_user_profiles', 'verificado', v_count, 
            format('Encontrados %s user_profiles sem company_id', v_count));
END $$;

-- 3.2 Backfill: Preencher company_id faltante a partir de user_tenant_mappings
UPDATE public.user_profiles 
SET company_id = (
    SELECT c.id 
    FROM public.user_tenant_mappings utm
    JOIN public.companies c ON c.tenant_id = utm.tenant_id
    WHERE utm.user_id = user_profiles.id
    ORDER BY c.created_at ASC
    LIMIT 1
)
WHERE company_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.user_tenant_mappings utm2 
    WHERE utm2.user_id = user_profiles.id
);

-- 3.3 Log de registros atualizados
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM public.user_profiles 
    WHERE company_id IS NULL;
    
    INSERT INTO public.auditoria_correcoes_log (etapa, status, registros_afetados, detalhes)
    VALUES ('backfill_user_profiles', 'concluido', v_count, 
            format('Restam %s user_profiles sem company_id após backfill', v_count));
END $$;

-- 3.4 Para usuários sem company_id mesmo após backfill, vincular à primeira empresa disponível
UPDATE public.user_profiles 
SET company_id = (SELECT id FROM public.companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL
AND EXISTS (SELECT 1 FROM public.companies);

-- 3.5 Adicionar NOT NULL constraint em company_id
ALTER TABLE public.user_profiles ALTER COLUMN company_id SET NOT NULL;

-- 3.6 Adicionar NOT NULL constraint em tenant_id (quando possível)
-- Primeiro tentar backfill
UPDATE public.user_profiles 
SET tenant_id = (
    SELECT utm.tenant_id 
    FROM public.user_tenant_mappings utm
    WHERE utm.user_id = user_profiles.id
    LIMIT 1
)
WHERE tenant_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.user_tenant_mappings utm2 
    WHERE utm2.user_id = user_profiles.id
);

-- Adicionar constraint NOT NULL em tenant_id se todos os registros estiverem preenchidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE tenant_id IS NULL
    ) THEN
        ALTER TABLE public.user_profiles ALTER COLUMN tenant_id SET NOT NULL;
        
        INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
        VALUES ('constraint_user_profiles_tenant', 'concluido', 'NOT NULL aplicado em tenant_id');
    ELSE
        INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
        VALUES ('constraint_user_profiles_tenant', 'alerta', 'tenant_id ainda possui NULLs, NOT NÃO aplicado');
    END IF;
END $$;

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('correcao_user_profiles', 'concluido', 'company_id preenchido e NOT NULL aplicado');

-- ============================================================
-- PARTE 4: TRIGGER DE VALIDAÇÃO DE CONSISTÊNCIA
-- ============================================================

-- 4.1 Trigger para validar consistência tenant/company em dispositivos
CREATE OR REPLACE FUNCTION public.validate_dispositivo_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_tenant uuid;
    v_user_role app_role;
BEGIN
    -- Se não tem company_id, permitir (registros legados)
    IF NEW.company_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar tenant da company
    SELECT tenant_id INTO v_company_tenant
    FROM public.companies WHERE id = NEW.company_id;

    IF v_company_tenant IS NULL THEN
        RAISE EXCEPTION 'Company % não tem tenant associado', NEW.company_id;
    END IF;

    -- Se executado por usuário autenticado, validar acesso
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_user_role FROM public.user_roles
        WHERE user_id = auth.uid() LIMIT 1;

        -- Super admin tem acesso global
        IF v_user_role = 'admin_global' THEN
            RETURN NEW;
        END IF;

        -- Demais usuários: tenant deve estar nos mappings
        IF NOT EXISTS (
            SELECT 1 FROM public.user_tenant_mappings
            WHERE user_id = auth.uid() AND tenant_id = v_company_tenant
        ) THEN
            RAISE EXCEPTION 'Usuário não tem acesso ao tenant da company %', NEW.company_id;
        END IF;
    END IF;

    -- Sincronizar tenant_id se necessário
    IF NEW.tenant_id IS NULL OR NEW.tenant_id != v_company_tenant THEN
        NEW.tenant_id := v_company_tenant;
    END IF;

    RETURN NEW;
END;
$$;

-- Aplicar trigger em dispositivos
DROP TRIGGER IF EXISTS trg_validate_dispositivo_tenant ON public.dispositivos;
CREATE TRIGGER trg_validate_dispositivo_tenant
    BEFORE INSERT OR UPDATE OF company_id ON public.dispositivos
    FOR EACH ROW EXECUTE FUNCTION public.validate_dispositivo_tenant_consistency();

-- 4.2 Trigger para validar consistência em companies
CREATE OR REPLACE FUNCTION public.validate_company_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- tenant_id não pode ser NULL
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'company.tenant_id não pode ser NULL';
    END IF;

    -- Verificar se tenant existe
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Tenant % não existe', NEW.tenant_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_company_tenant ON public.companies;
CREATE TRIGGER trg_validate_company_tenant
    BEFORE INSERT OR UPDATE OF tenant_id ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.validate_company_tenant_consistency();

-- 4.3 Trigger para validar consistência em stores
CREATE OR REPLACE FUNCTION public.validate_store_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_tenant uuid;
BEGIN
    -- tenant_id não pode ser NULL
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'store.tenant_id não pode ser NULL';
    END IF;

    -- Se tem company_id, verificar se pertence ao mesmo tenant
    IF NEW.company_id IS NOT NULL THEN
        SELECT tenant_id INTO v_company_tenant
        FROM public.companies WHERE id = NEW.company_id;

        IF v_company_tenant IS NULL THEN
            RAISE EXCEPTION 'Company % não tem tenant associado', NEW.company_id;
        END IF;

        IF v_company_tenant != NEW.tenant_id THEN
            RAISE EXCEPTION 'Store.company_id % não pertence ao tenant %', 
                NEW.company_id, NEW.tenant_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_store_consistency ON public.stores;
CREATE TRIGGER trg_validate_store_consistency
    BEFORE INSERT OR UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.validate_store_consistency();

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('triggers_validacao', 'concluido', 'Triggers de validação de consistência criados');

-- ============================================================
-- PARTE 5: CORREÇÃO DO HANDLE_NEW_USER (FLUXO DE CRIAÇÃO)
-- ============================================================

-- 5.1 Atualizar função handle_new_user para exigir company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_company_id uuid;
    v_role text;
BEGIN
    v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id','')::uuid;
    v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    -- Tentar inferir company_id se não fornecido mas tenant_id existe
    IF v_company_id IS NULL AND v_tenant_id IS NOT NULL THEN
        SELECT id INTO v_company_id
        FROM public.companies
        WHERE tenant_id = v_tenant_id
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Tentar inferir tenant_id se não fornecido mas company_id existe
    IF v_tenant_id IS NULL AND v_company_id IS NOT NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.companies
        WHERE id = v_company_id;
    END IF;

    -- Se ainda não tem company_id, não permitir criação (ou usar empresa padrão)
    IF v_company_id IS NULL THEN
        -- Tentar usar primeira empresa disponível
        SELECT id INTO v_company_id
        FROM public.companies
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Se não há empresas, não criar o perfil (evitar órfãos)
        IF v_company_id IS NULL THEN
            -- Não criar user_profile - usuário será criado sem perfil
            -- Isso força o admin a vincular manualmente depois
            RAISE WARNING 'Novo usuário % criado sem company_id - perfil não gerado automaticamente', NEW.id;
            RETURN NEW;
        END IF;
    END IF;

    -- Criar user_profile com dados válidos
    INSERT INTO public.user_profiles (id, tenant_id, company_id, role, created_at, updated_at)
    VALUES (NEW.id, v_tenant_id, v_company_id, v_role, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role,
        updated_at = now();

    -- Também criar vinculação em user_tenant_mappings se tem tenant
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
        VALUES (NEW.id, v_tenant_id, (v_role = 'admin'))
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('correcao_handle_new_user', 'concluido', 'Função handle_new_user atualizada para garantir company_id');

-- ============================================================
-- PARTE 6: ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para acelerar consultas de RLS
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_mappings_user_id ON public.user_tenant_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_mappings_tenant_id ON public.user_tenant_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_company_id ON public.dispositivos(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant_id ON public.stores(tenant_id);

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('indices_performance', 'concluido', 'Índices de performance criados para RLS');

-- ============================================================
-- PARTE 7: FUNÇÕES AUXILIARES DE AUDITORIA
-- ============================================================

-- Função para verificar integridade dos dados
CREATE OR REPLACE FUNCTION public.auditoria_verificar_integridade()
RETURNS TABLE (
    categoria text,
    problema text,
    quantidade integer,
    severidade text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Dispositivos sem company_id
    RETURN QUERY
    SELECT 
        'dispositivos'::text,
        'Dispositivos sem company_id (órfãos)'::text,
        COUNT(*)::integer,
        'ALTA'::text
    FROM public.dispositivos 
    WHERE company_id IS NULL;

    -- User_profiles sem tenant_id
    RETURN QUERY
    SELECT 
        'user_profiles'::text,
        'Perfis sem tenant_id'::text,
        COUNT(*)::integer,
        'MEDIA'::text
    FROM public.user_profiles 
    WHERE tenant_id IS NULL;

    -- Inconsistências tenant/company
    RETURN QUERY
    SELECT 
        'dispositivos'::text,
        'Inconsistências tenant/company em dispositivos'::text,
        COUNT(*)::integer,
        'ALTA'::text
    FROM public.dispositivos d
    JOIN public.companies c ON d.company_id = c.id
    WHERE d.tenant_id IS NOT NULL 
    AND d.tenant_id != c.tenant_id;

    -- Users sem vinculação a tenant
    RETURN QUERY
    SELECT 
        'usuarios'::text,
        'Usuários sem vinculação a tenant'::text,
        COUNT(*)::integer,
        'MEDIA'::text
    FROM public.user_profiles up
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_tenant_mappings utm 
        WHERE utm.user_id = up.id
    );
END;
$$;

-- Função para listar dispositivos órfãos
CREATE OR REPLACE FUNCTION public.auditoria_listar_dispositivos_orfaos()
RETURNS TABLE (
    id integer,
    serial text,
    apelido text,
    empresa text,
    ultimo_heartbeat timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.serial,
        d.apelido_interno,
        d.empresa,
        d.last_heartbeat_at
    FROM public.dispositivos d
    WHERE d.company_id IS NULL
    ORDER BY d.last_heartbeat_at DESC NULLS LAST;
END;
$$;

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('funcoes_auditoria', 'concluido', 'Funções de auditoria criadas');

-- ============================================================
-- PARTE 8: RELATÓRIO FINAL
-- ============================================================

INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
VALUES ('fim', 'concluido', 'Todas as correções da auditoria foram aplicadas');

-- View para ver relatório das correções
CREATE OR REPLACE VIEW public.vw_auditoria_relatorio AS
SELECT 
    etapa,
    status,
    COALESCE(registros_afetados, 0) as registros_afetados,
    detalhes,
    executado_em
FROM public.auditoria_correcoes_log
ORDER BY executado_em DESC;

-- ============================================================
-- INSTRUÇÕES DE VERIFICAÇÃO APÓS EXECUÇÃO
-- ============================================================

/*
Execute estas queries para verificar o resultado:

-- 1. Verificar RLS ativado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'stores', 'dispositivos', 'user_profiles', 'playlists');

-- 2. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('companies', 'stores', 'dispositivos', 'user_profiles');

-- 3. Verificar integridade dos dados
SELECT * FROM public.auditoria_verificar_integridade();

-- 4. Listar dispositivos órfãos (se houver)
SELECT * FROM public.auditoria_listar_dispositivos_orfaos();

-- 5. Ver log das correções
SELECT * FROM public.vw_auditoria_relatorio;
*/
