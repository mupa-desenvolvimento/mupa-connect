-- 1. Executar atualização dos logs antigos
UPDATE public.product_queries_log pql
SET
  company_id = d.company_id,
  tenant_id = d.tenant_id
FROM public.dispositivos d
WHERE TRIM(LOWER(pql.device_id)) = TRIM(LOWER(d.serial))
AND (
  pql.company_id IS NULL 
  OR pql.tenant_id IS NULL
);

-- 2. Criar função para preenchimento automático no INSERT
CREATE OR REPLACE FUNCTION public.handle_product_queries_log_ids()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Tentar localizar o dispositivo pelo serial
  SELECT company_id, tenant_id 
  INTO v_company_id, v_tenant_id
  FROM public.dispositivos
  WHERE TRIM(LOWER(serial)) = TRIM(LOWER(NEW.device_id))
  LIMIT 1;

  -- Se encontrou, preenche os campos no novo registro
  IF v_company_id IS NOT NULL THEN
    NEW.company_id := v_company_id;
  END IF;
  
  IF v_tenant_id IS NOT NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar o trigger para novos logs
DROP TRIGGER IF EXISTS tr_fill_product_queries_log_ids ON public.product_queries_log;
CREATE TRIGGER tr_fill_product_queries_log_ids
BEFORE INSERT ON public.product_queries_log
FOR EACH ROW
EXECUTE FUNCTION public.handle_product_queries_log_ids();

-- 4. Garantir índice de performance
CREATE INDEX IF NOT EXISTS idx_product_queries_device_id 
ON public.product_queries_log(device_id);