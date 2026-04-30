-- ============================================================
-- AUDITORIA MUPA 3.0 — CORREÇÕES CONSOLIDADAS
-- ============================================================

-- ---------- 1. BACKFILL DE USUÁRIOS ----------

-- Admin a3206408 já está em user_tenant_mappings (tenant Zaffari): preencher profile
UPDATE public.user_profiles
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
WHERE id = 'a3206408-4513-42ff-97cf-caf4366da5dd' AND tenant_id IS NULL;

-- Admin 191ec703 — vincular ao tenant Zaffari (criar mapping + atualizar profile)
INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
VALUES ('191ec703-83a3-4364-ad68-04a55ff2c239', 'f822bf9d-39e9-4726-82f7-c16bf267bc39', true)
ON CONFLICT DO NOTHING;

UPDATE public.user_profiles
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
WHERE id = '191ec703-83a3-4364-ad68-04a55ff2c239' AND tenant_id IS NULL;

-- ---------- 2. CHAVES ESTRANGEIRAS (idempotente) ----------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='companies_tenant_id_fkey') THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stores_tenant_id_fkey') THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profiles_company_id_fkey') THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profiles_tenant_id_fkey') THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dispositivos_company_id_fkey') THEN
    ALTER TABLE public.dispositivos
      ADD CONSTRAINT dispositivos_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------- 3. ÍNDICES ----------

CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant_id ON public.stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_company_id ON public.dispositivos(company_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_empresa ON public.dispositivos(empresa);

-- ---------- 4. TRIGGER DE CONSISTÊNCIA TENANT/COMPANY ----------

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
  -- Sem company_id: nada a validar (registros legados)
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tenant da company
  SELECT tenant_id INTO v_company_tenant
  FROM public.companies WHERE id = NEW.company_id;

  IF v_company_tenant IS NULL THEN
    RAISE EXCEPTION 'Company % não tem tenant associado', NEW.company_id;
  END IF;

  -- Se executado por usuário autenticado (não service role), valida acesso
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_dispositivo_tenant ON public.dispositivos;
CREATE TRIGGER trg_validate_dispositivo_tenant
  BEFORE INSERT OR UPDATE OF company_id ON public.dispositivos
  FOR EACH ROW EXECUTE FUNCTION public.validate_dispositivo_tenant_consistency();

-- ---------- 5. handle_new_user TRIGGER ----------
-- Garantir que todo auth.users novo tenha um user_profiles correspondente

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, company_id, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'tenant_id','')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 6. HARDENING RLS — remove policies legadas de "devices" (tabela inexistente, no-op safe) ----------
-- (As policies foram criadas em migrations anteriores na tabela errada; nada a remover aqui)

-- ---------- 7. AUDITORIA: marcar dispositivos órfãos ----------
-- Não há coluna metadata em dispositivos; criamos uma flag simples via comentário
COMMENT ON COLUMN public.dispositivos.company_id IS
  'FK para companies.id. NULL = dispositivo legado importado do Bubble (574 registros em 2026-04-30) cujo campo "empresa" contém ID externo não mapeável. Filtrar e revisar manualmente.';

-- ---------- 8. NOT NULL onde seguro ----------
-- companies.tenant_id: 0 nulls atualmente
ALTER TABLE public.companies ALTER COLUMN tenant_id SET NOT NULL;
-- stores.tenant_id: 0 nulls atualmente
ALTER TABLE public.stores ALTER COLUMN tenant_id SET NOT NULL;