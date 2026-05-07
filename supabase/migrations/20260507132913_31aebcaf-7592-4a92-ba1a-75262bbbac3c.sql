-- Enable RLS on product_query_errors if not already enabled
ALTER TABLE public.product_query_errors ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies to avoid duplicates
DROP POLICY IF EXISTS "Global Admin can view all errors" ON public.product_query_errors;
DROP POLICY IF EXISTS "Users can view their tenant errors" ON public.product_query_errors;

-- Create policies
CREATE POLICY "Global Admin can view all errors"
ON public.product_query_errors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_global'
  )
);

CREATE POLICY "Users can view their tenant errors"
ON public.product_query_errors
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_mappings
    WHERE user_id = auth.uid()
  )
);

-- Sync existing errors from product_queries_log
INSERT INTO public.product_query_errors (
    tenant_id,
    company_id,
    store_id,
    device_serial,
    device_name,
    store_name,
    ean,
    product_code,
    product_name,
    error_type,
    error_message,
    status,
    created_at
)
SELECT 
    d.tenant_id,
    d.company_id,
    d.store_id,
    l.device_id as device_serial,
    COALESCE(d.apelido_interno, l.apelido) as device_name,
    l.loja as store_name,
    l.ean,
    l.codigo_produto as product_code,
    l.descricao_produto as product_name,
    CASE 
        WHEN l.status_code = 404 THEN 'PRODUTO_NAO_ENCONTRADO'
        WHEN l.status_code = 500 THEN 'ERRO_SERVIDOR'
        WHEN l.status_code = 401 THEN 'NAO_AUTORIZADO'
        WHEN l.status_code = 403 THEN 'ACESSO_NEGADO'
        WHEN l.status_code = 503 THEN 'SERVICO_INDISPONIVEL'
        ELSE 'ERRO_CONEXAO'
    END as error_type,
    'Status code: ' || COALESCE(l.status_code::text, 'unknown') as error_message,
    'active' as status,
    l.created_at
FROM public.product_queries_log l
JOIN public.dispositivos d ON l.device_id = d.serial
WHERE l.status_code != 200 AND d.tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create trigger function to automatically sync future errors
CREATE OR REPLACE FUNCTION public.sync_product_query_error()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_store_id UUID;
    v_device_name TEXT;
BEGIN
    IF NEW.status_code != 200 THEN
        SELECT tenant_id, company_id, store_id, apelido_interno 
        INTO v_tenant_id, v_company_id, v_store_id, v_device_name
        FROM public.dispositivos
        WHERE serial = NEW.device_id
        LIMIT 1;

        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.product_query_errors (
                tenant_id,
                company_id,
                store_id,
                device_serial,
                device_name,
                store_name,
                ean,
                product_code,
                product_name,
                error_type,
                error_message,
                status,
                created_at
            ) VALUES (
                v_tenant_id,
                v_company_id,
                v_store_id,
                NEW.device_id,
                COALESCE(v_device_name, NEW.apelido),
                NEW.loja,
                NEW.ean,
                NEW.codigo_produto,
                NEW.descricao_produto,
                CASE 
                    WHEN NEW.status_code = 404 THEN 'PRODUTO_NAO_ENCONTRADO'
                    WHEN NEW.status_code = 500 THEN 'ERRO_SERVIDOR'
                    WHEN NEW.status_code = 401 THEN 'NAO_AUTORIZADO'
                    WHEN NEW.status_code = 403 THEN 'ACESSO_NEGADO'
                    WHEN NEW.status_code = 503 THEN 'SERVICO_INDISPONIVEL'
                    ELSE 'ERRO_CONEXAO'
                END,
                'Status code: ' || NEW.status_code,
                'active',
                NEW.created_at
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_sync_product_query_error ON public.product_queries_log;
CREATE TRIGGER tr_sync_product_query_error
AFTER INSERT ON public.product_queries_log
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_query_error();
