-- Adiciona as colunas de tenant e company para a tabela de logs de consultas
ALTER TABLE public.product_queries_log 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS device_serial TEXT;

-- Cria índices para performance nos filtros de analytics
CREATE INDEX IF NOT EXISTS idx_product_queries_log_tenant_id ON public.product_queries_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_company_id ON public.product_queries_log(company_id);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_created_at ON public.product_queries_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_device_id ON public.product_queries_log(device_id);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_device_serial ON public.product_queries_log(device_serial);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_loja ON public.product_queries_log(loja);
CREATE INDEX IF NOT EXISTS idx_product_queries_log_ean ON public.product_queries_log(ean);