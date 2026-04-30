DO $$
DECLARE
  v_user_id uuid := 'a3206408-4513-42ff-97cf-caf4366da5dd';
  v_company_id uuid := 'fd55dbdd-63da-442e-aa99-5575c0496622';
  v_tenant_id uuid := 'f822bf9d-39e9-4726-82f7-c16bf267bc39';
BEGIN
  INSERT INTO public.user_profiles (id, company_id, tenant_id, role)
  VALUES (v_user_id, v_company_id, v_tenant_id, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        tenant_id = EXCLUDED.tenant_id,
        role = EXCLUDED.role;

  DELETE FROM public.user_tenant_mappings WHERE user_id = v_user_id;
  INSERT INTO public.user_tenant_mappings (user_id, tenant_id)
  VALUES (v_user_id, v_tenant_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;