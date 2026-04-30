-- Habilitar RLS na tabela devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Authenticated admins can manage devices" ON public.devices;
DROP POLICY IF EXISTS "Public can create devices during setup" ON public.devices;
DROP POLICY IF EXISTS "Public can update pending device during setup" ON public.devices;

-- 1. Super Admins: Acesso total (Global)
CREATE POLICY "Super admins have full access to devices"
ON public.devices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_global'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_global'
  )
);

-- 2. Tenant Admins: Acesso a dispositivos do seu Tenant
CREATE POLICY "Tenant admins can manage their tenant's devices"
ON public.devices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_mappings utm
    JOIN public.companies c ON c.tenant_id = utm.tenant_id
    WHERE utm.user_id = auth.uid() 
    AND utm.is_tenant_admin = true
    AND c.id = devices.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenant_mappings utm
    JOIN public.companies c ON c.tenant_id = utm.tenant_id
    WHERE utm.user_id = auth.uid() 
    AND utm.is_tenant_admin = true
    AND c.id = devices.company_id
  )
);

-- 3. Users: Acesso a dispositivos de empresas permitidas (se houver tabela de mapeamento empresa-usuário)
-- Como não encontramos uma tabela 'user_company_mappings', assumimos que se o usuário não é admin global nem tenant admin, 
-- ele pode ver apenas se explicitamente permitido por algum outro critério ou se o tenant admin o vinculou.
-- Por agora, vamos manter o isolamento por tenant/company via tenant mapping.

-- 4. Dispositivos em setup (Público/Autenticado temporário)
-- Mantendo a lógica anterior de permitir criação/update durante o setup se necessário, 
-- mas vinculando ao fluxo de segurança.
CREATE POLICY "Allow device creation during setup"
ON public.devices
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Allow update of pending devices during setup"
ON public.devices
FOR UPDATE
TO authenticated, anon
USING (status = 'pending')
WITH CHECK (status = 'pending');
