-- ============================================================
-- VINCULAR USUÁRIO ANTUNES À EMPRESA ZAFFARI
-- ============================================================
-- Usuário: antunes@mupa.app
-- Empresa: Comercial Zaffari (003ZAF)

-- Dados identificados:
-- - User ID: a3206408-4513-42ff-97cf-caf4366da5dd
-- - Company ID Zaffari: fd55dbdd-63da-442e-aa99-5575c0496622
-- - Tenant ID Zaffari: f822bf9d-39e9-4726-82f7-c16bf267bc39

-- ============================================================
-- PARTE 1: GARANTIR USER_PROFILE COMPLETO
-- ============================================================

-- Atualizar/Garantir user_profile do antunes com company_id e tenant_id
INSERT INTO public.user_profiles (id, tenant_id, company_id, role, created_at, updated_at)
VALUES (
    'a3206408-4513-42ff-97cf-caf4366da5dd',
    'f822bf9d-39e9-4726-82f7-c16bf267bc39',
    'fd55dbdd-63da-442e-aa99-5575c0496622',
    'admin',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    updated_at = now();

-- ============================================================
-- PARTE 2: GARANTIR USER_TENANT_MAPPING
-- ============================================================

-- Criar vinculação tenant admin
INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
VALUES ('a3206408-4513-42ff-97cf-caf4366da5dd', 'f822bf9d-39e9-4726-82f7-c16bf267bc39', true)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_tenant_admin = true;

-- ============================================================
-- PARTE 3: GARANTIR USER_ROLES (admin)
-- ============================================================

-- Remover roles antigos para evitar duplicidade
DELETE FROM public.user_roles WHERE user_id = 'a3206408-4513-42ff-97cf-caf4366da5dd';

-- Inserir role admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('a3206408-4513-42ff-97cf-caf4366da5dd', 'admin');

-- ============================================================
-- PARTE 4: SINCRONIZAR DISPOSITIVOS COM EMPRESA ZAFFARI
-- ============================================================

-- Atualizar dispositivos da empresa Zaffari (003ZAF) para ter company_id correto
UPDATE public.dispositivos 
SET company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622'
WHERE empresa = '003ZAF'
AND (company_id IS NULL OR company_id != 'fd55dbdd-63da-442e-aa99-5575c0496622');

-- Nota: tabela dispositivos não tem tenant_id diretamente
-- O tenant é determinado via company_id -> companies.tenant_id

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

-- Log de confirmação
DO $$
DECLARE
    v_user_profile_count INTEGER;
    v_tenant_mapping_count INTEGER;
    v_user_roles_count INTEGER;
    v_dispositivos_count INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO v_user_profile_count
    FROM public.user_profiles 
    WHERE id = 'a3206408-4513-42ff-97cf-caf4366da5dd'
    AND company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';

    SELECT COUNT(*) INTO v_tenant_mapping_count
    FROM public.user_tenant_mappings
    WHERE user_id = 'a3206408-4513-42ff-97cf-caf4366da5dd'
    AND tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39';

    SELECT COUNT(*) INTO v_user_roles_count
    FROM public.user_roles
    WHERE user_id = 'a3206408-4513-42ff-97cf-caf4366da5dd'
    AND role = 'admin';

    SELECT COUNT(*) INTO v_dispositivos_count
    FROM public.dispositivos
    WHERE empresa = '003ZAF'
    AND company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';

    -- Log
    INSERT INTO public.auditoria_correcoes_log (etapa, status, detalhes)
    VALUES ('vincular_antunes_zaffari', 'concluido', 
            format('user_profile: %s, tenant_mapping: %s, user_roles: %s, dispositivos_vinculados: %s',
                   v_user_profile_count, v_tenant_mapping_count, v_user_roles_count, v_dispositivos_count));
END $$;

-- ============================================================
-- QUERIES DE VERIFICAÇÃO (execute após migration)
-- ============================================================

/*
-- Verificar vinculação do usuário
SELECT 
    up.id,
    up.tenant_id,
    up.company_id,
    up.role,
    c.nome as empresa_nome,
    t.name as tenant_name
FROM public.user_profiles up
JOIN public.companies c ON c.id = up.company_id
JOIN public.tenants t ON t.id = up.tenant_id
WHERE up.id = 'a3206408-4513-42ff-97cf-caf4366da5dd';

-- Verificar dispositivos que o usuário deve ver
SELECT COUNT(*) as total_dispositivos
FROM public.dispositivos
WHERE company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';

-- Verificar políticas RLS que aplicam ao usuário
SELECT * FROM pg_policies WHERE tablename = 'dispositivos';
*/
