CREATE OR REPLACE FUNCTION public.validate_dispositivo_tenant_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- NOTA: A coluna tenant_id não existe na tabela dispositivos, 
    -- por isso a sincronização foi removida para evitar erros.

    RETURN NEW;
END;
$function$;

UPDATE public.dispositivos 
SET company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622' 
WHERE empresa = '003ZAF';