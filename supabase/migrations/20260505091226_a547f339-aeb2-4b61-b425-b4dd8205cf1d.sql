CREATE OR REPLACE FUNCTION public.check_device_integrity(p_device_id INT8)
RETURNS TABLE (
  is_consistent BOOLEAN,
  issues TEXT[]
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_d RECORD;
  v_issues TEXT[] := '{}';
BEGIN
  SELECT tenant_id, company_id, store_id FROM public.dispositivos WHERE id = p_device_id INTO v_d;
  
  -- Verificar Empresa
  IF v_d.company_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_d.company_id AND tenant_id = v_d.tenant_id) THEN
      v_issues := v_issues || 'Empresa não pertence ao Tenant';
    END IF;
  END IF;
  
  -- Verificar Loja
  IF v_d.store_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = v_d.store_id AND tenant_id = v_d.tenant_id) THEN
      v_issues := v_issues || 'Loja não pertence ao Tenant';
    END IF;
  END IF;

  RETURN QUERY SELECT (array_length(v_issues, 1) IS NULL), v_issues;
END;
$$;