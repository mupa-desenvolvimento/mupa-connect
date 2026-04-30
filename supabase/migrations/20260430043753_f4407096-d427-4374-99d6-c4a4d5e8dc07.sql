-- Habilitar RLS na tabela de logs de consultas
ALTER TABLE public.product_queries_log ENABLE ROW LEVEL SECURITY;

-- Política para administradores globais verem tudo
CREATE POLICY "Admin Global pode ver todos os logs"
ON public.product_queries_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin_global'
    )
);

-- Política para usuários de tenant verem logs de seus dispositivos
-- Fluxo: user -> user_tenant_mappings (tenant_id) -> companies (tenant_id) -> devices (company_id) -> log (device_id)
CREATE POLICY "Usuarios podem ver logs de seus dispositivos"
ON public.product_queries_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_tenant_mappings utm
        JOIN public.companies c ON c.tenant_id = utm.tenant_id
        JOIN public.devices d ON d.company_id = c.id
        WHERE utm.user_id = auth.uid()
        AND (d.id::text = product_queries_log.device_id OR d.device_code = product_queries_log.device_id)
    )
);