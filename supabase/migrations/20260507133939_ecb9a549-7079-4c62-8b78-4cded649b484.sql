-- Índices para product_query_errors
CREATE INDEX IF NOT EXISTS idx_product_query_errors_device_serial ON public.product_query_errors (device_serial);
CREATE INDEX IF NOT EXISTS idx_product_query_errors_created_at ON public.product_query_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_query_errors_tenant_id ON public.product_query_errors (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_query_errors_store_id ON public.product_query_errors (store_id);

-- Índices para dispositivos (serial é text, usado para join com errors)
CREATE INDEX IF NOT EXISTS idx_dispositivos_serial ON public.dispositivos (serial);
CREATE INDEX IF NOT EXISTS idx_dispositivos_store_id ON public.dispositivos (store_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_tenant_id ON public.dispositivos (tenant_id);

-- Índices para lojas (stores)
CREATE INDEX IF NOT EXISTS idx_stores_id ON public.stores (id);
