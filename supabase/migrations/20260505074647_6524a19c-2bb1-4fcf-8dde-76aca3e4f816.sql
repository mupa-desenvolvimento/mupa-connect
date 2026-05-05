-- 1. Atualizar registros existentes
UPDATE public.dispositivos 
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39' 
WHERE empresa LIKE '%003ZAF%' AND (tenant_id IS NULL OR tenant_id != 'f822bf9d-39e9-4726-82f7-c16bf267bc39');

-- 2. Criar função de trigger para automatizar para o futuro
CREATE OR REPLACE FUNCTION public.fn_assign_tenant_by_empresa_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa LIKE '%003ZAF%' THEN
    NEW.tenant_id := 'f822bf9d-39e9-4726-82f7-c16bf267bc39';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplicar o trigger na tabela dispositivos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assign_tenant_by_empresa_name') THEN
        CREATE TRIGGER trg_assign_tenant_by_empresa_name
        BEFORE INSERT OR UPDATE OF empresa ON public.dispositivos
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_assign_tenant_by_empresa_name();
    END IF;
END $$;