-- ============================================================
-- DIAGNÓSTICO: DISPOSITIVOS NÃO APARECEM PARA USUÁRIO
-- ============================================================

-- ============================================================
-- 1. VERIFICAR USUÁRIO AUTENTICADO
-- ============================================================

-- Simular auth.uid() - Substitua pelo UUID real do antunes@mupa.app
-- Se não souber o UUID, execute: SELECT id FROM auth.users WHERE email = 'antunes@mupa.app';

-- ============================================================
-- 2. VERIFICAR DADOS DO USUÁRIO
-- ============================================================

-- 2.1 User Profile
SELECT 'USER_PROFILE' as check_type, 
       id, 
       tenant_id, 
       company_id, 
       role,
       CASE WHEN company_id IS NULL THEN 'ERRO: SEM COMPANY_ID' ELSE 'OK' END as status
FROM public.user_profiles 
WHERE id = 'a3206408-4513-42ff-97cf-caf4366da5dd';

-- 2.2 User Tenant Mappings
SELECT 'USER_TENANT_MAPPING' as check_type,
       user_id,
       tenant_id,
       is_tenant_admin,
       'OK' as status
FROM public.user_tenant_mappings
WHERE user_id = 'a3206408-4513-42ff-97cf-caf4366da5dd';

-- 2.3 User Roles
SELECT 'USER_ROLES' as check_type,
       user_id,
       role,
       'OK' as status
FROM public.user_roles
WHERE user_id = 'a3206408-4513-42ff-97cf-caf4366da5dd';

-- ============================================================
-- 3. VERIFICAR EMPRESA E TENANT
-- ============================================================

-- 3.1 Empresa Zaffari
SELECT 'EMPRESA_ZAFFARI' as check_type,
       id,
       nome,
       tenant_id,
       ativo,
       CASE WHEN id = 'fd55dbdd-63da-442e-aa99-5575c0496622' THEN 'OK' ELSE 'UUID DIFERENTE' END as status
FROM public.companies
WHERE _id = '003ZAF' OR nome ILIKE '%zaffari%';

-- 3.2 Tenant Zaffari
SELECT 'TENANT_ZAFFARI' as check_type,
       id,
       name,
       slug,
       is_active,
       CASE WHEN id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39' THEN 'OK' ELSE 'UUID DIFERENTE' END as status
FROM public.tenants
WHERE name ILIKE '%zaffari%' OR id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39';

-- ============================================================
-- 4. VERIFICAR DISPOSITIVOS
-- ============================================================

-- 4.1 Total de dispositivos Zaffari (código 003ZAF)
SELECT 'DISPOSITIVOS_TOTAL_003ZAF' as check_type,
       COUNT(*) as total,
       COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as com_company_id,
       COUNT(CASE WHEN company_id IS NULL THEN 1 END) as sem_company_id
FROM public.dispositivos
WHERE empresa = '003ZAF';

-- 4.2 Dispositivos com company_id da Zaffari
SELECT 'DISPOSITIVOS_COM_COMPANY' as check_type,
       d.id,
       d.apelido_interno,
       d.empresa,
       d.company_id,
       CASE 
           WHEN d.company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622' THEN 'VINCULADO_ZAFFARI'
           WHEN d.company_id IS NULL THEN 'SEM_COMPANY_ID'
           ELSE 'OUTRA_EMPRESA'
       END as status
FROM public.dispositivos d
WHERE d.empresa = '003ZAF'
LIMIT 10;

-- ============================================================
-- 5. TESTAR POLÍTICAS RLS (Simulando usuário)
-- ============================================================

-- 5.1 Testar se usuário teria acesso via política user_dispositivos_access
SELECT 'RLS_TEST_USER_ACCESS' as check_type,
       COUNT(*) as dispositivos_visiveis,
       CASE WHEN COUNT(*) > 0 THEN 'OK - USUÁRIO VERIA DISPOSITIVOS' ELSE 'ERRO - NENHUM DISPOSITIVO VISÍVEL' END as status
FROM public.dispositivos d
WHERE d.company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622'  -- company_id do usuário
AND d.company_id IS NOT NULL;

-- 5.2 Verificar se company_id do usuário existe em dispositivos
SELECT 'RLS_COMPANY_MATCH' as check_type,
       up.company_id as user_company_id,
       d.empresa,
       COUNT(*) as dispositivos_match
FROM public.user_profiles up
LEFT JOIN public.dispositivos d ON d.company_id = up.company_id
WHERE up.id = 'a3206408-4513-42ff-97cf-caf4366da5dd'
GROUP BY up.company_id, d.empresa;

-- ============================================================
-- 6. VERIFICAR POLÍTICAS RLS ATIVAS
-- ============================================================

-- 6.1 Políticas da tabela dispositivos
SELECT 'RLS_POLICIES' as check_type,
       tablename,
       policyname,
       permissive,
       cmd,
       qual IS NOT NULL as has_using_clause,
       with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'dispositivos';

-- 6.2 Verificar se RLS está ativado
SELECT 'RLS_STATUS' as check_type,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'dispositivos'
AND n.nspname = 'public';

-- ============================================================
-- 7. CORREÇÃO AUTOMÁTICA SE NECESSÁRIO
-- ============================================================

-- Se dispositivos 003ZAF não têm company_id, corrigir
UPDATE public.dispositivos 
SET company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622'
WHERE empresa = '003ZAF'
AND (company_id IS NULL OR company_id != 'fd55dbdd-63da-442e-aa99-5575c0496622');

-- Verificar resultado da correção
SELECT 'CORRECAO_APLICADA' as check_type,
       COUNT(*) as dispositivos_atualizados
FROM public.dispositivos
WHERE empresa = '003ZAF'
AND company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';

-- ============================================================
-- 8. RELATÓRIO FINAL
-- ============================================================

DO $$
DECLARE
    v_user_company_id UUID;
    v_dispositivos_count INTEGER;
    v_user_profile_exists BOOLEAN;
BEGIN
    -- Verificar se user_profile existe
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = 'a3206408-4513-42ff-97cf-caf4366da5dd'
    ) INTO v_user_profile_exists;
    
    -- Obter company_id do usuário
    SELECT company_id INTO v_user_company_id
    FROM public.user_profiles
    WHERE id = 'a3206408-4513-42ff-97cf-caf4366da5dd';
    
    -- Contar dispositivos
    SELECT COUNT(*) INTO v_dispositivos_count
    FROM public.dispositivos
    WHERE company_id = v_user_company_id;
    
    -- Log
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DIAGNÓSTICO FINAL';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'User Profile Existe: %', v_user_profile_exists;
    RAISE NOTICE 'Company ID do Usuário: %', v_user_company_id;
    RAISE NOTICE 'Dispositivos Vinculados: %', v_dispositivos_count;
    
    IF v_dispositivos_count = 0 THEN
        RAISE NOTICE '⚠️  ALERTA: Nenhum dispositivo vinculado ao company_id do usuário!';
        RAISE NOTICE 'Possíveis causas:';
        RAISE NOTICE '1. Dispositivos têm empresa = 003ZAF mas company_id = NULL';
        RAISE NOTICE '2. Company ID do usuário não corresponde aos dispositivos';
        RAISE NOTICE '3. RLS está bloqueando o acesso';
    ELSE
        RAISE NOTICE '✅ OK: Usuário deveria ver % dispositivos', v_dispositivos_count;
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- ============================================================
-- INSTRUÇÕES
-- ============================================================

/*
APÓS EXECUTAR ESTE SCRIPT:

1. Verifique os resultados das queries acima
2. Se houver dispositivos atualizados, recarregue a página (F5)
3. Se ainda não aparecer, verifique o console do navegador (F12)
   - Look for erros de permissão (403/RLS)
   - Verifique se a query está sendo feita corretamente

4. Para testar manualmente:
   SELECT * FROM public.dispositivos 
   WHERE company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';

5. Se RLS estiver bloqueando, verifique se as políticas estão corretas:
   SELECT * FROM pg_policies WHERE tablename = 'dispositivos';
*/
