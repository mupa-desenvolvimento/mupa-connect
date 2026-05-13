-- Fix: alguns ambientes não possuem stores.company_id, mas o trigger validate_store_consistency referenciava o campo
-- Isso gerava erro em runtime: record "new" has no field "Company_id"/"company_id"

CREATE OR REPLACE FUNCTION public.validate_store_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_tenant uuid;
  v_company_id uuid;
  v_has_company_id boolean;
  v_new jsonb;
BEGIN
  v_new := to_jsonb(NEW);

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'store.tenant_id não pode ser NULL';
  END IF;

  v_has_company_id := (v_new ? 'company_id') OR (v_new ? 'Company_id');

  IF v_has_company_id THEN
    v_company_id := COALESCE(
      NULLIF(v_new->>'company_id', '')::uuid,
      NULLIF(v_new->>'Company_id', '')::uuid
    );

    IF v_company_id IS NOT NULL THEN
      SELECT tenant_id INTO v_company_tenant
      FROM public.companies
      WHERE id = v_company_id;

      IF v_company_tenant IS NULL THEN
        RAISE EXCEPTION 'Company % não tem tenant associado', v_company_id;
      END IF;

      IF v_company_tenant != NEW.tenant_id THEN
        RAISE EXCEPTION 'Store.company_id % não pertence ao tenant %',
          v_company_id, NEW.tenant_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_store_consistency ON public.stores;
CREATE TRIGGER trg_validate_store_consistency
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_consistency();

