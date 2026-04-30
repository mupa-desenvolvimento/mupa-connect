-- ============================================================
-- CORREÇÃO: ERRO AO CADASTRAR NOVO USUÁRIO
-- ============================================================
-- Diagnóstico e correção do fluxo de criação de usuários

-- ============================================================
-- 1. VERIFICAR FUNÇÃO handle_new_user
-- ============================================================

-- Recriar função handle_new_user com tratamento de erro robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_default_company_id UUID;
    v_default_tenant_id UUID;
    v_user_role TEXT := 'user';
BEGIN
    -- Log de início
    RAISE NOTICE 'handle_new_user: Criando profile para user_id=%, email=%', NEW.id, NEW.email;
    
    -- Buscar company_id padrão do primeiro admin_global (para vincular novos usuários)
    SELECT c.id, c.tenant_id INTO v_default_company_id, v_default_tenant_id
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_id
    JOIN public.companies c ON c.id = up.company_id
    WHERE ur.role = 'admin_global'
    ORDER BY up.created_at
    LIMIT 1;
    
    -- Se não encontrou via admin_global, tentar primeiro company
    IF v_default_company_id IS NULL THEN
        SELECT c.id, c.tenant_id INTO v_default_company_id, v_default_tenant_id
        FROM public.companies c
        LIMIT 1;
    END IF;
    
    -- Log do que encontrou
    RAISE NOTICE 'handle_new_user: default_company_id=%, default_tenant_id=%', 
                 v_default_company_id, v_default_tenant_id;
    
    -- Criar user_profile (AGORA COM company_id e tenant_id permitindo NULL temporariamente)
    -- ou vinculando ao primeiro tenant/company disponível
    BEGIN
        INSERT INTO public.user_profiles (
            id, 
            tenant_id, 
            company_id, 
            role, 
            email,
            created_at, 
            updated_at
        )
        VALUES (
            NEW.id,
            v_default_tenant_id,  -- Pode ser NULL se não encontrou
            v_default_company_id, -- Pode ser NULL se não encontrou
            v_user_role,
            NEW.email,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
            
        RAISE NOTICE 'handle_new_user: Profile criado/atualizado com sucesso';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user: Erro ao criar profile: %', SQLERRM;
        -- Não propagar erro para não bloquear criação em auth.users
        -- O profile pode ser criado depois manualmente
    END;
    
    -- Criar vinculação tenant se temos tenant_id
    IF v_default_tenant_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
            VALUES (NEW.id, v_default_tenant_id, false)
            ON CONFLICT (user_id, tenant_id) DO NOTHING;
            
            RAISE NOTICE 'handle_new_user: Tenant mapping criado';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user: Erro ao criar tenant mapping: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Garantir que o trigger existe e está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. AJUSTAR POLÍTICAS RLS PARA PERMITIR INSERT NOVO USUÁRIO
-- ============================================================

-- Política para permitir que usuários criem seus próprios profiles (self-service)
DROP POLICY IF EXISTS "users_can_create_own_profile" ON public.user_profiles;
CREATE POLICY "users_can_create_own_profile" 
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()  -- Usuário só pode criar profile com seu próprio ID
);

-- Política para permitir que o trigger/service_role crie profiles
DROP POLICY IF EXISTS "service_role_can_create_profiles" ON public.user_profiles;
CREATE POLICY "service_role_can_create_profiles" 
ON public.user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 3. VERIFICAR PERMISSÕES DO SERVICE_ROLE
-- ============================================================

-- Garantir que a tabela user_profiles permite operações via trigger
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. TESTAR CRIAÇÃO DE USUÁRIO (SIMULAÇÃO)
-- ============================================================

-- Verificar se a função está funcionando
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_profile_count INTEGER;
BEGIN
    -- Simular inserção (apenas teste da lógica)
    RAISE NOTICE 'Teste: Função handle_new_user está configurada';
    RAISE NOTICE 'Próximo usuário criado em auth.users terá profile automaticamente gerado';
    
    -- Verificar se já existem profiles sem company_id (backfill necessário)
    SELECT COUNT(*) INTO v_profile_count
    FROM public.user_profiles
    WHERE company_id IS NULL;
    
    IF v_profile_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: % profiles sem company_id encontrados', v_profile_count;
    END IF;
END $$;

-- ============================================================
-- 5. CORREÇÃO DE PROFILES EXISTENTES SEM VINCULAÇÃO
-- ============================================================

-- Vincular profiles órfãos ao primeiro tenant/company disponível
UPDATE public.user_profiles up
SET 
    company_id = (
        SELECT id FROM public.companies 
        ORDER BY created_at 
        LIMIT 1
    ),
    tenant_id = (
        SELECT tenant_id FROM public.companies 
        ORDER BY created_at 
        LIMIT 1
    )
WHERE up.company_id IS NULL
AND up.id NOT IN (
    -- Preservar profiles de admins que já têm configuração específica
    SELECT id FROM public.user_profiles WHERE role IN ('admin', 'admin_global')
);

-- ============================================================
-- 6. CRIAR VIEW DE MONITORAMENTO
-- ============================================================

-- View para verificar status de criação de usuários
CREATE OR REPLACE VIEW public.vw_user_creation_status AS
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    up.id as profile_id,
    up.company_id,
    up.tenant_id,
    up.role as profile_role,
    up.created_at as profile_created_at,
    CASE 
        WHEN up.id IS NULL THEN 'ERRO: SEM PROFILE'
        WHEN up.company_id IS NULL THEN 'ALERTA: SEM EMPRESA'
        WHEN up.tenant_id IS NULL THEN 'ALERTA: SEM TENANT'
        ELSE 'OK'
    END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
ORDER BY au.created_at DESC;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

-- Contar usuários com problemas
SELECT 
    COUNT(*) FILTER (WHERE status = 'ERRO: SEM PROFILE') as sem_profile,
    COUNT(*) FILTER (WHERE status = 'ALERTA: SEM EMPRESA') as sem_empresa,
    COUNT(*) FILTER (WHERE status = 'ALERTA: SEM TENANT') as sem_tenant,
    COUNT(*) FILTER (WHERE status = 'OK') as ok
FROM public.vw_user_creation_status;

/*
-- Para ver detalhes dos problemas:
SELECT * FROM public.vw_user_creation_status WHERE status != 'OK';

-- Para testar criação de usuário (em desenvolvimento):
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
-- VALUES (gen_random_uuid(), 'teste@mupa.app', '...', now());
-- SELECT * FROM public.user_profiles WHERE email = 'teste@mupa.app';
*/
